import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MEDIA_TRANSCRIPT_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { SearchService } from '../search/search.service';
import type { CreateMemoryStoryDto, UpdateMemoryStoryDto, UpdateTranscriptDto } from './memory-stories.dto';

@Injectable()
export class MemoryStoriesService {
  private transcriptQueue: Queue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly search: SearchService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  private getTranscriptQueue(): Queue | null {
    if (this.transcriptQueue) return this.transcriptQueue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.transcriptQueue = new Queue(MEDIA_TRANSCRIPT_QUEUE, { connection: { url } });
    return this.transcriptQueue;
  }

  async list(personId?: string) {
    const workspaceId = this.requireWorkspaceId();
    const rows = await this.prisma.memoryStory.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(personId ? { subjectPersonId: personId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        subjectPerson: { select: { id: true, givenName: true, familyName: true } },
        media: { select: { id: true, mimeType: true } },
      },
    });

    return rows.map((r) => this.toDto(r));
  }

  async getOne(id: string) {
    const workspaceId = this.requireWorkspaceId();
    const row = await this.prisma.memoryStory.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        subjectPerson: { select: { id: true, givenName: true, familyName: true } },
        media: {
          include: { mediaTranscript: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Memory story not found');
    return this.toDto(row, row.media?.mediaTranscript ?? null);
  }

  async create(dto: CreateMemoryStoryDto, user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    const person = await this.prisma.person.findFirst({
      where: { id: dto.subjectPersonId, workspaceId, deletedAt: null },
    });
    if (!person) throw new NotFoundException('Subject person not found');

    const row = await this.prisma.memoryStory.create({
      data: {
        workspaceId,
        title: dto.title,
        description: dto.description,
        subjectPersonId: dto.subjectPersonId,
        narratorPersonId: dto.narratorPersonId,
        language: dto.language ?? 'ru',
        mediaId: dto.mediaId,
        createdById: user.id,
        status: dto.mediaId ? 'PROCESSING' : 'DRAFT',
      },
      include: {
        subjectPerson: { select: { id: true, givenName: true, familyName: true } },
      },
    });

    if (dto.mediaId) {
      await this.enqueueTranscript(dto.mediaId, row.id, user.id, dto.language ?? 'ru');
    }

    return this.toDto(row);
  }

  async update(id: string, dto: UpdateMemoryStoryDto) {
    const workspaceId = this.requireWorkspaceId();
    const existing = await this.prisma.memoryStory.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Memory story not found');

    const row = await this.prisma.memoryStory.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        subjectPersonId: dto.subjectPersonId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      },
      include: {
        subjectPerson: { select: { id: true, givenName: true, familyName: true } },
      },
    });

    await this.search.indexMemoryStory(id);
    return this.toDto(row);
  }

  async updateTranscript(id: string, dto: UpdateTranscriptDto, user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    const story = await this.prisma.memoryStory.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { media: true },
    });
    if (!story?.mediaId) throw new BadRequestException('Memory has no media for transcript');

    await this.prisma.mediaTranscript.upsert({
      where: { mediaId: story.mediaId },
      create: {
        mediaId: story.mediaId,
        text: dto.text,
        segments: dto.segments ?? undefined,
        language: story.language,
        editedAt: new Date(),
        editedById: user.id,
      },
      update: {
        text: dto.text,
        segments: dto.segments ?? undefined,
        editedAt: new Date(),
        editedById: user.id,
      },
    });

    await this.search.indexMemoryStory(id);
    return this.getOne(id);
  }

  async retryTranscript(id: string, user: AuthenticatedUser) {
    const story = await this.getOne(id);
    if (!story.mediaId) throw new BadRequestException('No media attached');
    await this.enqueueTranscript(story.mediaId, id, user.id, story.language);
    return { ok: true };
  }

  async enqueueTranscript(mediaId: string, memoryStoryId: string, requestedBy: string, language: string) {
    const jobRecord = await this.prisma.mediaTranscriptJob.create({
      data: { mediaId, memoryStoryId, status: 'QUEUED', requestedBy, language },
    });

    const queue = this.getTranscriptQueue();
    if (!queue) {
      await this.processTranscriptInline(jobRecord.id, mediaId, memoryStoryId, language);
      return jobRecord;
    }

    await queue.add('transcribe', { jobId: jobRecord.id, mediaId, memoryStoryId, language, requestedBy });
    return jobRecord;
  }

  async processTranscriptInline(jobId: string, mediaId: string, memoryStoryId: string, language: string) {
    await this.prisma.mediaTranscriptJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const media = await this.prisma.media.findFirst({ where: { id: mediaId, deletedAt: null } });
      if (!media) throw new Error('Media not found');

      const placeholderText =
        language === 'en'
          ? '[Transcript placeholder — enable AI service with Whisper for automatic speech-to-text.]'
          : '[Транскcript placeholder — включите AI service (Whisper) для автоматического распознавания речи.]';

      const segments = [{ startMs: 0, endMs: 1000, text: placeholderText, confidence: 0.3 }];

      await this.prisma.mediaTranscript.upsert({
        where: { mediaId },
        create: { mediaId, text: placeholderText, segments, language, confidence: 0.3 },
        update: { text: placeholderText, segments, language, confidence: 0.3 },
      });

      await this.prisma.memoryStory.update({
        where: { id: memoryStoryId },
        data: {
          status: 'READY',
          summary: `${placeholderText.slice(0, 120)}… [assumption: STT stub]`,
        },
      });

      await this.prisma.mediaTranscriptJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      await this.search.indexMemoryStory(memoryStoryId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcript failed';
      await this.prisma.mediaTranscriptJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: message, completedAt: new Date() },
      });
      await this.prisma.memoryStory.update({
        where: { id: memoryStoryId },
        data: { status: 'FAILED' },
      });
    }
  }

  private toDto(
    row: {
      id: string;
      title: string;
      description?: string | null;
      status: string;
      subjectPersonId: string;
      mediaId?: string | null;
      summary?: string | null;
      language: string;
      recordedAt?: Date | null;
      subjectPerson?: { givenName: string; familyName?: string | null };
    },
    transcript?: { text: string; segments?: unknown; language: string; confidence?: number | null; editedAt?: Date | null } | null,
  ) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      subjectPersonId: row.subjectPersonId,
      subjectPersonName: row.subjectPerson
        ? `${row.subjectPerson.familyName ?? ''} ${row.subjectPerson.givenName}`.trim()
        : undefined,
      mediaId: row.mediaId,
      summary: row.summary,
      language: row.language,
      recordedAt: row.recordedAt?.toISOString() ?? null,
      transcript: transcript
        ? {
            text: transcript.text,
            segments: transcript.segments,
            language: transcript.language,
            confidence: transcript.confidence,
            editedAt: transcript.editedAt?.toISOString() ?? null,
          }
        : null,
      uncertaintyNote: 'AI outputs may include assumptions — verify against sources.',
    };
  }
}
