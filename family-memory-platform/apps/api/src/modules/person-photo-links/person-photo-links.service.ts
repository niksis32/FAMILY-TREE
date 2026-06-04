import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import {
  computePeriodConfidence,
  resolvePhotoYear,
  type BulkTaggingMediaItem,
  type PersonMatchSuggestion,
  type PhotoWorkspacePayload,
} from '@family/shared';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { AiService } from '../ai/ai.service';
import type { BulkAssignFaceTagsDto, UpsertPhotoInsightDto } from './person-photo-links.dto';

@Injectable()
export class PersonPhotoLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly aiService: AiService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async getWorkspace(mediaId: string): Promise<PhotoWorkspacePayload> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      include: {
        faceTags: {
          orderBy: { createdAt: 'asc' },
          include: {
            person: {
              select: {
                id: true,
                givenName: true,
                patronymic: true,
                familyName: true,
                birthDate: true,
                deathDate: true,
                isLiving: true,
              },
            },
          },
        },
        insight: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true, email: true } },
          },
        },
        analysisJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    const download = await this.mediaService.createDownloadUrl(mediaId);

    return {
      media: {
        id: media.id,
        title: media.title,
        mimeType: media.mimeType,
        takenAt: media.takenAt?.toISOString() ?? null,
        downloadUrl: download.downloadUrl,
      },
      faceTags: media.faceTags.map((tag) => this.serializeFaceTag(tag)),
      insight: media.insight
        ? {
            ...media.insight,
            createdAt: media.insight.createdAt.toISOString(),
            updatedAt: media.insight.updatedAt.toISOString(),
          }
        : null,
      comments: media.comments.map((c) => ({
        id: c.id,
        mediaId: c.mediaId,
        authorId: c.authorId,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        author: c.author,
      })),
      analysisJob: media.analysisJobs[0]
        ? {
            id: media.analysisJobs[0].id,
            mediaId: media.analysisJobs[0].mediaId,
            status: media.analysisJobs[0].status,
            error: media.analysisJobs[0].error,
            requestedBy: media.analysisJobs[0].requestedBy,
            completedAt: media.analysisJobs[0].completedAt?.toISOString() ?? null,
            createdAt: media.analysisJobs[0].createdAt.toISOString(),
            updatedAt: media.analysisJobs[0].updatedAt.toISOString(),
          }
        : null,
      aiEnabled: this.config.get<string>('AI_SERVICE_ENABLED') === 'true',
      aiQueueAvailable: this.redis.isAvailable(),
    };
  }

  async listBulkTaggingQueue(): Promise<BulkTaggingMediaItem[]> {
    const images = await this.prisma.media.findMany({
      where: { deletedAt: null, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        faceTags: { select: { id: true, personId: true } },
      },
    });

    const items: BulkTaggingMediaItem[] = [];
    for (const media of images) {
      const taggedFaceCount = media.faceTags.filter((t) => t.personId).length;
      const untaggedFaceCount = media.faceTags.filter((t) => !t.personId).length;
      const hasWork = untaggedFaceCount > 0 || media.faceTags.length === 0;
      if (!hasWork) continue;

      let thumbnailUrl: string | null = null;
      try {
        const dl = await this.mediaService.createDownloadUrl(media.id);
        thumbnailUrl = dl.downloadUrl;
      } catch {
        thumbnailUrl = null;
      }

      items.push({
        id: media.id,
        title: media.title,
        mimeType: media.mimeType,
        takenAt: media.takenAt?.toISOString() ?? null,
        untaggedFaceCount: media.faceTags.length === 0 ? 1 : untaggedFaceCount,
        taggedFaceCount,
        thumbnailUrl,
      });
    }

    return items;
  }

  async bulkAssign(dto: BulkAssignFaceTagsDto) {
    const results = [];
    for (const item of dto.assignments) {
      const tag = await this.prisma.photoFaceTag.update({
        where: { id: item.faceTagId },
        data: { personId: item.personId },
        include: {
          person: {
            select: {
              id: true,
              givenName: true,
              patronymic: true,
              familyName: true,
              birthDate: true,
              deathDate: true,
              isLiving: true,
            },
          },
        },
      });
      results.push(tag);
    }
    return { updated: results.length, tags: results };
  }

  async upsertInsight(mediaId: string, dto: UpsertPhotoInsightDto) {
    await this.ensureMedia(mediaId);
    const insight = await this.prisma.photoInsight.upsert({
      where: { mediaId },
      create: { mediaId, ...dto },
      update: { ...dto },
    });
    return {
      ...insight,
      createdAt: insight.createdAt.toISOString(),
      updatedAt: insight.updatedAt.toISOString(),
    };
  }

  async suggestMatches(
    mediaId: string,
    user: AuthenticatedUser,
    faceTagId?: string,
  ): Promise<PersonMatchSuggestion[]> {
    const workspace = await this.getWorkspace(mediaId);
    const photoYear = resolvePhotoYear(
      workspace.media.takenAt,
      workspace.insight?.estimatedYearFrom,
      workspace.insight?.estimatedYearTo,
    );

    const faceTag = faceTagId
      ? workspace.faceTags.find((t) => t.id === faceTagId)
      : workspace.faceTags.find((t) => !t.personId);

    const persons = await this.prisma.person.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        givenName: true,
        patronymic: true,
        familyName: true,
        birthDate: true,
        deathDate: true,
        isLiving: true,
        avatarMediaId: true,
      },
      take: 500,
    });

    if (this.config.get<string>('AI_SERVICE_ENABLED') === 'true' && faceTag) {
      const aiResult = await this.aiService.suggestPhotoPerson(
        {
          mediaId,
          faceTagId: faceTag.id,
          photoYear: photoYear ?? undefined,
          candidates: persons.map((p) => ({
            personId: p.id,
            givenName: p.givenName,
            familyName: p.familyName,
            patronymic: p.patronymic,
            birthYear: p.birthDate?.getUTCFullYear(),
            deathYear: p.deathDate?.getUTCFullYear(),
            hasAvatar: Boolean(p.avatarMediaId),
          })),
        },
        { userId: user.id, scope: { mediaId } },
      );

      const data = this.aiService.extractData<{ suggestions?: PersonMatchSuggestion[] }>(aiResult);
      if (data?.suggestions?.length) {
        return data.suggestions.map((s) => ({
          ...s,
          periodConfidence: computePeriodConfidence({
            photoYear,
            birthDate: persons.find((p) => p.id === s.personId)?.birthDate,
            deathDate: persons.find((p) => p.id === s.personId)?.deathDate,
            isLiving: persons.find((p) => p.id === s.personId)?.isLiving,
          }),
        }));
      }
    }

    return persons
      .map((person) => {
        const periodConfidence = computePeriodConfidence({
          photoYear,
          birthDate: person.birthDate,
          deathDate: person.deathDate,
          isLiving: person.isLiving,
        });
        let confidence = periodConfidence.score * 0.6;
        const reasons = [...periodConfidence.reasons];
        if (person.avatarMediaId) {
          confidence += 0.15;
          reasons.push('has_avatar');
        }
        if (faceTag?.label && person.givenName.toLowerCase().includes(faceTag.label.toLowerCase())) {
          confidence += 0.2;
          reasons.push('name_hint');
        }
        return {
          personId: person.id,
          givenName: person.givenName,
          familyName: person.familyName,
          patronymic: person.patronymic,
          confidence: Math.min(0.99, confidence),
          reasons,
          periodConfidence,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  async listComments(mediaId: string) {
    await this.ensureMedia(mediaId);
    const comments = await this.prisma.mediaComment.findMany({
      where: { mediaId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
    return comments.map((c) => ({
      id: c.id,
      mediaId: c.mediaId,
      authorId: c.authorId,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.author,
    }));
  }

  async addComment(mediaId: string, authorId: string, body: string) {
    await this.ensureMedia(mediaId);
    const comment = await this.prisma.mediaComment.create({
      data: { mediaId, authorId, body },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
    return {
      id: comment.id,
      mediaId: comment.mediaId,
      authorId: comment.authorId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.author,
    };
  }

  async updateComment(commentId: string, authorId: string, body: string) {
    const comment = await this.prisma.mediaComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.authorId !== authorId) {
      throw new NotFoundException('Comment not found');
    }
    const updated = await this.prisma.mediaComment.update({
      where: { id: commentId },
      data: { body },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
    return {
      id: updated.id,
      mediaId: updated.mediaId,
      authorId: updated.authorId,
      body: updated.body,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      author: updated.author,
    };
  }

  async removeComment(commentId: string, authorId: string, role: string) {
    const comment = await this.prisma.mediaComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== authorId && role !== 'ADMIN') {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.mediaComment.delete({ where: { id: commentId } });
    return { deleted: true, id: commentId };
  }

  private serializeFaceTag(tag: {
    id: string;
    mediaId: string;
    personId: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number | null;
    label: string | null;
    note: string | null;
    source: 'MANUAL' | 'AI';
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    person: {
      id: string;
      givenName: string;
      patronymic: string | null;
      familyName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      isLiving: boolean;
    } | null;
  }) {
    return {
      id: tag.id,
      mediaId: tag.mediaId,
      personId: tag.personId,
      x: tag.x,
      y: tag.y,
      width: tag.width,
      height: tag.height,
      confidence: tag.confidence,
      label: tag.label,
      note: tag.note,
      source: tag.source,
      createdBy: tag.createdBy,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
      person: tag.person
        ? {
            ...tag.person,
            birthDate: tag.person.birthDate?.toISOString() ?? null,
            deathDate: tag.person.deathDate?.toISOString() ?? null,
          }
        : null,
    };
  }

  private async ensureMedia(mediaId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, deletedAt: null } });
    if (!media) throw new NotFoundException('Media file not found');
    return media;
  }
}
