import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  FamilyStoryConfig,
  FamilyStoryModerationQueueItemDto,
  PublicFamilyStoryPayloadDto,
  PublicStoryDocumentDto,
  PublicStoryMediaDto,
  PublicStoryTimelineEntryDto,
} from '@family/shared';
import type { FamilyStory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import { MapService } from '../map/map.service';
import { MediaService } from '../media/media.service';
import { TimelineService } from '../timeline/timeline.service';
import {
  CreateFamilyStoryDto,
  DEFAULT_STORY_CONFIG,
  GenerateNarrativeDto,
  UpdateFamilyStoryDto,
} from './family-stories.dto';
import { FamilyStoriesPdfService } from './family-stories-pdf.service';
import { FamilyStoriesPrivacyService } from './family-stories-privacy.service';
import {
  parseStoryConfig,
  toDetailDto,
  toPublishStatusId,
  toSummaryDto,
  toTemplateId,
  toVisibilityLevel,
} from './family-stories.mapper';
import { isFamilyStoryModerationEnabled } from './family-stories.config';
import { generatePublicStoryToken, hashPublicStoryToken } from './family-stories.token';
import { normalizeStorySlug, slugifyTitle } from './family-stories.slug';
import { createHash } from 'node:crypto';
import { WebhookDomainHooksService } from '../webhooks/webhook-domain-hooks.service';
import { CollaborationHooksService } from '../collaboration/collaboration-hooks.service';

@Injectable()
export class FamilyStoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: FamilyStoriesPrivacyService,
    private readonly timeline: TimelineService,
    private readonly map: MapService,
    private readonly media: MediaService,
    private readonly documents: DocumentsService,
    private readonly ai: AiService,
    private readonly pdf: FamilyStoriesPdfService,
    private readonly config: ConfigService,
    @Optional() private readonly webhookHooks?: WebhookDomainHooksService,
    @Optional() private readonly collaborationHooks?: CollaborationHooksService,
  ) {}

  private moderationEnabled(): boolean {
    return isFamilyStoryModerationEnabled(this.config);
  }

  private initialPublishState(): { publishStatus: 'DRAFT' | 'PUBLISHED'; publishedAt: Date | null } {
    if (this.moderationEnabled()) {
      return { publishStatus: 'DRAFT', publishedAt: null };
    }
    return { publishStatus: 'PUBLISHED', publishedAt: new Date() };
  }

  async listForUser(userId: string) {
    const stories = await this.prisma.familyStory.findMany({
      where: { createdById: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    return stories.map((s) => toSummaryDto(s));
  }

  async findOneForUser(id: string, userId: string) {
    const story = await this.getOwnedStory(id, userId);
    return toDetailDto(story);
  }

  async create(userId: string, dto: CreateFamilyStoryDto) {
    this.validateScope(dto.scopeType, dto.scopePersonId, dto.scopeFamilyId);
    const { raw, hash } = generatePublicStoryToken();
    const config = dto.config ?? DEFAULT_STORY_CONFIG;
    if (config.sections.map.personId === undefined && dto.scopePersonId) {
      config.sections.map.personId = dto.scopePersonId;
    }
    if (config.sections.map.familyId === undefined && dto.scopeFamilyId) {
      config.sections.map.familyId = dto.scopeFamilyId;
    }

    const visibility = dto.visibility ?? 'LINK_ONLY';
    const slug = await this.resolveSlugForWrite({
      requestedSlug: dto.slug,
      title: dto.title,
      visibility,
    });

    const publishState = this.initialPublishState();
    const story = await this.prisma.familyStory.create({
      data: {
        title: dto.title,
        template: dto.template ?? 'CLASSIC',
        visibility,
        scopeType: dto.scopeType,
        scopePersonId: dto.scopePersonId,
        scopeFamilyId: dto.scopeFamilyId,
        hideLivingPersons: dto.hideLivingPersons ?? true,
        workspaceId: dto.workspaceId,
        createdById: userId,
        publicTokenHash: hash,
        configJson: config as object,
        coverMediaId: dto.coverMediaId,
        ogDescription: dto.ogDescription,
        slug,
        publishStatus: publishState.publishStatus,
        publishedAt: publishState.publishedAt,
      },
    });

    if (publishState.publishStatus === 'PUBLISHED') {
      void this.emitStoryPublishedWebhook(story);
    }

    return { ...toDetailDto(story), publicToken: raw, publicUrl: `/s/${raw}` };
  }

  async update(id: string, userId: string, dto: UpdateFamilyStoryDto) {
    const existing = await this.getOwnedStory(id, userId);
    const nextVisibility = dto.visibility ?? existing.visibility;
    const slug =
      dto.slug !== undefined || dto.visibility !== undefined || dto.title !== undefined
        ? await this.resolveSlugForWrite({
            requestedSlug: dto.slug,
            title: dto.title ?? existing.title,
            visibility: nextVisibility,
            existingSlug: existing.slug,
            excludeStoryId: id,
          })
        : undefined;

    const story = await this.prisma.familyStory.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.template !== undefined ? { template: dto.template } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.hideLivingPersons !== undefined ? { hideLivingPersons: dto.hideLivingPersons } : {}),
        ...(dto.config !== undefined ? { configJson: dto.config as object } : {}),
        ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId } : {}),
        ...(dto.ogDescription !== undefined ? { ogDescription: dto.ogDescription } : {}),
        ...(slug !== undefined ? { slug } : {}),
      },
    });
    return toDetailDto(story);
  }

  async remove(id: string, userId: string) {
    await this.getOwnedStory(id, userId);
    await this.prisma.familyStory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async rotateToken(id: string, userId: string) {
    await this.getOwnedStory(id, userId);
    const { raw, hash } = generatePublicStoryToken();
    const story = await this.prisma.familyStory.update({
      where: { id },
      data: { publicTokenHash: hash, tokenRevokedAt: null },
    });
    return { ...toDetailDto(story), publicToken: raw, publicUrl: `/s/${raw}` };
  }

  async revokeToken(id: string, userId: string) {
    await this.getOwnedStory(id, userId);
    const story = await this.prisma.familyStory.update({
      where: { id },
      data: { tokenRevokedAt: new Date() },
    });
    return toDetailDto(story);
  }

  async submitForReview(id: string, userId: string) {
    const story = await this.getOwnedStory(id, userId);
    if (!this.moderationEnabled()) {
      throw new BadRequestException('Story moderation is disabled on this server');
    }
    if (story.publishStatus === 'PUBLISHED') {
      throw new BadRequestException('Story is already published');
    }
    if (story.publishStatus === 'PENDING_REVIEW') {
      throw new BadRequestException('Story is already awaiting moderation');
    }

    const updated = await this.prisma.familyStory.update({
      where: { id },
      data: {
        publishStatus: 'PENDING_REVIEW',
        submittedForReviewAt: new Date(),
        moderationNote: null,
      },
    });
    return toDetailDto(updated);
  }

  async listModerationQueue(): Promise<FamilyStoryModerationQueueItemDto[]> {
    const rows = await this.prisma.familyStory.findMany({
      where: { publishStatus: 'PENDING_REVIEW', deletedAt: null },
      orderBy: { submittedForReviewAt: 'asc' },
      take: 100,
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
      },
    });

    const items: FamilyStoryModerationQueueItemDto[] = [];
    for (const row of rows) {
      let coverUrl: string | null = null;
      if (row.coverMediaId) {
        coverUrl = await this.media.createPublicAssetUrl(row.coverMediaId);
      }
      items.push({
        id: row.id,
        title: row.title,
        visibility: toVisibilityLevel(row.visibility),
        publishStatus: toPublishStatusId(row.publishStatus),
        slug: row.slug,
        submittedForReviewAt: row.submittedForReviewAt?.toISOString() ?? null,
        createdBy: row.createdBy,
        coverUrl,
      });
    }
    return items;
  }

  async approveStory(storyId: string, moderatorId: string, note?: string) {
    const story = await this.prisma.familyStory.findFirst({
      where: { id: storyId, deletedAt: null },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.publishStatus !== 'PENDING_REVIEW') {
      throw new BadRequestException('Story is not pending review');
    }

    const updated = await this.prisma.familyStory.update({
      where: { id: storyId },
      data: {
        publishStatus: 'PUBLISHED',
        publishedAt: new Date(),
        moderatedAt: new Date(),
        moderatedById: moderatorId,
        moderationNote: note ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: 'family_story.moderation.approve',
        entityType: 'family_story',
        entityId: storyId,
        payload: { title: story.title, note: note ?? null },
      },
    });

    void this.emitStoryPublishedWebhook(updated);

    return toDetailDto(updated);
  }

  private emitStoryPublishedWebhook(story: Pick<FamilyStory, 'workspaceId' | 'id' | 'title' | 'slug' | 'visibility' | 'createdById'>) {
    if (!story.workspaceId) return;
    void this.webhookHooks?.onStoryPublished({
      workspaceId: story.workspaceId,
      storyId: story.id,
      title: story.title,
      slug: story.slug,
      visibility: story.visibility,
    });
    void this.collaborationHooks?.onStoryPublished({
      workspaceId: story.workspaceId,
      actorUserId: story.createdById,
      storyId: story.id,
      title: story.title,
    });
  }

  async rejectStory(storyId: string, moderatorId: string, note: string) {
    const story = await this.prisma.familyStory.findFirst({
      where: { id: storyId, deletedAt: null },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.publishStatus !== 'PENDING_REVIEW') {
      throw new BadRequestException('Story is not pending review');
    }

    const updated = await this.prisma.familyStory.update({
      where: { id: storyId },
      data: {
        publishStatus: 'REJECTED',
        moderatedAt: new Date(),
        moderatedById: moderatorId,
        moderationNote: note,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: 'family_story.moderation.reject',
        entityType: 'family_story',
        entityId: storyId,
        payload: { title: story.title, note },
      },
    });

    return toDetailDto(updated);
  }

  async generateNarrative(id: string, userId: string, dto: GenerateNarrativeDto) {
    const story = await this.getOwnedStory(id, userId);
    const persons = await this.privacy.loadScopePersons(
      story.scopeType,
      story.scopePersonId,
      story.scopeFamilyId,
    );
    const redacted = this.privacy.redactPersons(persons, {
      hideLivingPersons: story.hideLivingPersons,
      isPublicGuest: false,
    });

    const aiResult = await this.ai.generateFamilyStoryNarrative({
      title: story.title,
      language: dto.language ?? 'ru',
      persons: redacted.map((p) => ({ name: p.displayName, birthYear: p.birthYear, deathYear: p.deathYear })),
      template: toTemplateId(story.template),
    }, { userId, scope: { storyId: id } });
    const aiData = this.ai.extractData<{ narrative?: string }>(aiResult);

    const narrativeText =
      typeof aiData?.narrative === 'string'
        ? aiData.narrative
        : `Family story «${story.title}» — narrative will be generated when AI_SERVICE_ENABLED is configured.`;

    const updated = await this.prisma.familyStory.update({
      where: { id },
      data: { narrativeText, narrativeGeneratedAt: new Date() },
    });
    return toDetailDto(updated);
  }

  async getPublicByToken(
    token: string,
    opts?: { userId?: string; ip?: string; userAgent?: string; recordView?: boolean },
  ) {
    const hash = hashPublicStoryToken(token);
    const story = await this.prisma.familyStory.findFirst({
      where: { publicTokenHash: hash, deletedAt: null },
    });
    if (!story) throw new NotFoundException('Story not found');

    return this.buildPublicPayload(story, {
      hasValidToken: true,
      viewerUserId: opts?.userId,
      recordView: opts?.recordView !== false,
      ip: opts?.ip,
      userAgent: opts?.userAgent,
    });
  }

  async getPublicBySlug(
    slug: string,
    token?: string,
    opts?: { userId?: string; ip?: string; userAgent?: string; recordView?: boolean },
  ) {
    const story = await this.prisma.familyStory.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!story) throw new NotFoundException('Story not found');

    const hasValidToken = token ? hashPublicStoryToken(token) === story.publicTokenHash : false;
    const isPublic = story.visibility === 'PUBLIC';
    return this.buildPublicPayload(story, {
      hasValidToken: hasValidToken || isPublic,
      viewerUserId: opts?.userId,
      recordView: opts?.recordView !== false,
      ip: opts?.ip,
      userAgent: opts?.userAgent,
    });
  }

  async previewForOwner(id: string, userId: string) {
    const story = await this.getOwnedStory(id, userId);
    return this.buildPublicPayload(story, {
      hasValidToken: true,
      viewerUserId: userId,
      recordView: false,
      isOwner: true,
    });
  }

  async exportPdfByToken(token: string) {
    const payload = await this.getPublicByToken(token, { recordView: false });
    const html = this.pdf.buildPrintableHtml(payload);
    const buffer = await this.pdf.renderPdfBuffer(html);
    return { buffer, filename: `${sanitizeFilename(payload.title)}.pdf` };
  }

  /** PUBLIC stories with slug — safe for sitemap (no secret tokens). */
  async listSitemapEntries() {
    const rows = await this.prisma.familyStory.findMany({
      where: {
        visibility: 'PUBLIC',
        publishStatus: 'PUBLISHED',
        slug: { not: null },
        deletedAt: null,
        tokenRevokedAt: null,
        publishedAt: { not: null },
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    return {
      entries: rows
        .filter((r): r is typeof r & { slug: string } => Boolean(r.slug))
        .map((r) => ({
          slug: r.slug,
          updatedAt: r.updatedAt.toISOString(),
          publishedAt: r.publishedAt?.toISOString() ?? null,
        })),
    };
  }

  private async buildPublicPayload(
    story: FamilyStory,
    access: {
      hasValidToken: boolean;
      viewerUserId?: string;
      recordView: boolean;
      ip?: string;
      userAgent?: string;
      isOwner?: boolean;
    },
  ): Promise<PublicFamilyStoryPayloadDto> {
    const visibility = toVisibilityLevel(story.visibility);
    const isWorkspaceMember = access.viewerUserId
      ? await this.isWorkspaceMember(story.workspaceId, access.viewerUserId)
      : false;

    const allowed = this.privacy.canAccessStory({
      visibility,
      tokenRevokedAt: story.tokenRevokedAt,
      isOwner: access.isOwner ?? false,
      isWorkspaceMember,
      hasValidToken: access.hasValidToken,
      isAuthenticated: Boolean(access.viewerUserId),
    });

    if (!allowed) throw new ForbiddenException('Story is not accessible');

    if (this.moderationEnabled() && story.publishStatus !== 'PUBLISHED') {
      const canPreviewUnpublished = access.isOwner || access.hasValidToken;
      if (!canPreviewUnpublished) {
        throw new ForbiddenException('Story is awaiting moderation or not published yet');
      }
    }

    const config = parseStoryConfig(story.configJson);
    const personsDb = await this.privacy.loadScopePersons(
      story.scopeType,
      story.scopePersonId,
      story.scopeFamilyId,
    );
    const persons = this.privacy.redactPersons(personsDb, {
      hideLivingPersons: story.hideLivingPersons,
      isPublicGuest: !access.viewerUserId,
    });

    const timeline = config.sections.timeline.enabled
      ? await this.buildTimeline(config, story, personsDb.map((p) => p.id))
      : [];

    let mapPayload: PublicFamilyStoryPayloadDto['map'] = null;
    if (config.sections.map.enabled) {
      try {
        if (config.sections.map.personId) {
          mapPayload = await this.map.getPersonMap(config.sections.map.personId, {});
        } else if (config.sections.map.familyId) {
          mapPayload = await this.map.getFamilyMap(config.sections.map.familyId, {});
        } else if (story.scopePersonId) {
          mapPayload = await this.map.getPersonMap(story.scopePersonId, {});
        } else if (story.scopeFamilyId) {
          mapPayload = await this.map.getFamilyMap(story.scopeFamilyId, {});
        }
      } catch {
        mapPayload = null;
      }
    }

    const media = config.sections.media.enabled
      ? await this.loadPublicMedia(config.sections.media.mediaIds)
      : [];

    const documents = config.sections.documents.enabled
      ? await this.loadPublicDocuments(config.sections.documents.documentIds)
      : [];

    let coverUrl: string | null = null;
    if (story.coverMediaId) {
      try {
        coverUrl = await this.media.createPublicAssetUrl(story.coverMediaId);
      } catch {
        coverUrl = null;
      }
    }

    if (access.recordView) {
      await this.recordView(story.id, access.ip, access.userAgent);
    }

    return {
      id: story.id,
      title: story.title,
      template: toTemplateId(story.template),
      visibility: toVisibilityLevel(story.visibility),
      publishStatus: toPublishStatusId(story.publishStatus),
      slug: story.slug,
      narrativeText: config.sections.narrative.enabled ? story.narrativeText : null,
      ogDescription: story.ogDescription,
      coverUrl,
      hideLivingPersons: story.hideLivingPersons,
      persons,
      timeline,
      map: mapPayload,
      media,
      documents,
      customBlocks: config.sections.customBlocks ?? [],
      viewCount: story.viewCount + (access.recordView ? 1 : 0),
      updatedAt: story.updatedAt.toISOString(),
      publishedAt: story.publishedAt?.toISOString() ?? null,
    };
  }

  private async resolveSlugForWrite(params: {
    requestedSlug?: string | null;
    title: string;
    visibility: string;
    existingSlug?: string | null;
    excludeStoryId?: string;
  }): Promise<string | null> {
    if (params.visibility !== 'PUBLIC') {
      return params.requestedSlug === undefined
        ? params.existingSlug ?? null
        : params.requestedSlug
          ? normalizeStorySlug(params.requestedSlug)
          : null;
    }

    const base =
      params.requestedSlug != null && params.requestedSlug !== ''
        ? normalizeStorySlug(params.requestedSlug)
        : params.existingSlug
          ? params.existingSlug
          : slugifyTitle(params.title);

    return this.ensureUniqueSlug(base, params.excludeStoryId);
  }

  private async ensureUniqueSlug(base: string, excludeStoryId?: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (true) {
      const conflict = await this.prisma.familyStory.findFirst({
        where: {
          slug: candidate,
          deletedAt: null,
          ...(excludeStoryId ? { id: { not: excludeStoryId } } : {}),
        },
        select: { id: true },
      });
      if (!conflict) return candidate;
      const trimmed = base.slice(0, Math.max(1, 120 - String(suffix).length - 1));
      candidate = `${trimmed}-${suffix}`;
      suffix += 1;
    }
  }

  private async buildTimeline(
    config: FamilyStoryConfig,
    story: FamilyStory,
    scopePersonIds: string[],
  ): Promise<PublicStoryTimelineEntryDto[]> {
    const personIds =
      config.sections.timeline.personIds?.length
        ? config.sections.timeline.personIds
        : story.scopeType === 'PERSON' && story.scopePersonId
          ? [story.scopePersonId]
          : scopePersonIds;

    const entries: PublicStoryTimelineEntryDto[] = [];
    for (const personId of personIds.slice(0, 20)) {
      try {
        const tl = await this.timeline.getPersonTimeline(personId);
        for (const e of tl.events) {
          entries.push({
            id: e.id,
            title: e.title,
            date: e.dateFrom ?? e.dateTo ?? null,
            description: e.description ?? null,
            type: e.type,
          });
        }
      } catch {
        /* skip missing person */
      }
    }
    return entries.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }

  private async loadPublicMedia(mediaIds: string[]): Promise<PublicStoryMediaDto[]> {
    const result: PublicStoryMediaDto[] = [];
    for (const id of mediaIds.slice(0, 48)) {
      try {
        const row = await this.prisma.media.findFirst({ where: { id, deletedAt: null } });
        if (!row) continue;
        const url = await this.media.createPublicAssetUrl(id);
        if (!url) continue;
        result.push({
          id,
          title: row.title,
          url,
          mimeType: row.mimeType,
        });
      } catch {
        /* skip */
      }
    }
    return result;
  }

  private async loadPublicDocuments(documentIds: string[]): Promise<PublicStoryDocumentDto[]> {
    const result: PublicStoryDocumentDto[] = [];
    for (const id of documentIds.slice(0, 24)) {
      try {
        const doc = await this.documents.findOne(id);
        const presigned = await this.documents.getPresignedDownloadUrl(id);
        result.push({
          id,
          title: doc.title,
          mimeType: doc.mimeType,
          previewUrl: presigned.downloadUrl,
        });
      } catch {
        /* skip */
      }
    }
    return result;
  }

  private async recordView(storyId: string, ip?: string, userAgent?: string) {
    const viewerIpHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
    await this.prisma.$transaction([
      this.prisma.familyStoryView.create({
        data: { storyId, viewerIpHash, userAgent: userAgent?.slice(0, 512) },
      }),
      this.prisma.familyStory.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      }),
    ]);
  }

  private async isWorkspaceMember(workspaceId: string | null, userId: string) {
    if (!workspaceId) return false;
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return Boolean(member);
  }

  private async getOwnedStory(id: string, userId: string) {
    const story = await this.prisma.familyStory.findFirst({
      where: { id, createdById: userId, deletedAt: null },
    });
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

  private validateScope(scopeType: string, personId?: string, familyId?: string) {
    if (scopeType === 'PERSON' && !personId) {
      throw new BadRequestException('scopePersonId is required for PERSON scope');
    }
    if (scopeType === 'FAMILY_BRANCH' && !familyId) {
      throw new BadRequestException('scopeFamilyId is required for FAMILY_BRANCH scope');
    }
  }
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\-]+/g, '_').slice(0, 80) || 'family-story';
}
