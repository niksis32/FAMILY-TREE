import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FamilyStoryConfig,
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
  toSummaryDto,
  toTemplateId,
  toVisibilityLevel,
} from './family-stories.mapper';
import { generatePublicStoryToken, hashPublicStoryToken } from './family-stories.token';
import { createHash } from 'node:crypto';

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
  ) {}

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

    const story = await this.prisma.familyStory.create({
      data: {
        title: dto.title,
        template: dto.template ?? 'CLASSIC',
        visibility: dto.visibility ?? 'LINK_ONLY',
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
        slug: dto.slug,
        publishedAt: new Date(),
      },
    });

    return { ...toDetailDto(story), publicToken: raw, publicUrl: `/s/${raw}` };
  }

  async update(id: string, userId: string, dto: UpdateFamilyStoryDto) {
    await this.getOwnedStory(id, userId);
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
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
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
    });
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
        const cover = await this.media.createDownloadUrl(story.coverMediaId);
        coverUrl = cover.downloadUrl;
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
    };
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
        const dl = await this.media.createDownloadUrl(id);
        result.push({
          id,
          title: row.title,
          url: dl.downloadUrl,
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
