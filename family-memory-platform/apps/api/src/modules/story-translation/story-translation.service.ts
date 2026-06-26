import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { StoryLocaleDto, StoryTranslationJobDto } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import type { RequestStoryTranslationDto } from './story-translation.dto';

@Injectable()
export class StoryTranslationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  async listLocales(storyId: string, userId: string): Promise<StoryLocaleDto[]> {
    await this.assertStoryAccess(storyId, userId);
    const rows = await this.prisma.storyLocale.findMany({
      where: { storyId },
      orderBy: { locale: 'asc' },
    });
    return rows.map((row) => this.toLocaleDto(row));
  }

  async requestTranslation(
    storyId: string,
    userId: string,
    dto: RequestStoryTranslationDto,
  ): Promise<{ locale: StoryLocaleDto; job: StoryTranslationJobDto }> {
    const story = await this.assertStoryAccess(storyId, userId);
    const sourceLocale = dto.sourceLocale ?? 'ru';
    const targetLocale = dto.targetLocale.toLowerCase();

    const locale = await this.prisma.storyLocale.upsert({
      where: { storyId_locale: { storyId, locale: targetLocale } },
      create: {
        storyId,
        locale: targetLocale,
        sourceLocale,
        title: story.title,
        status: 'TRANSLATING',
      },
      update: { status: 'TRANSLATING', sourceLocale },
    });

    const job = await this.prisma.storyTranslationJob.create({
      data: {
        storyId,
        storyLocaleId: locale.id,
        targetLocale,
        requestedById: userId,
        status: 'PROCESSING',
      },
    });

    const translatedTitle = `[${targetLocale.toUpperCase()}] ${story.title}`;
    const sourceText = story.narrativeText ?? story.title;
    const translatedNarrative = `[${targetLocale}] ${sourceText}`;

    const [updatedLocale, completedJob] = await this.prisma.$transaction([
      this.prisma.storyLocale.update({
        where: { id: locale.id },
        data: {
          title: translatedTitle,
          narrativeText: translatedNarrative,
          status: 'READY',
          translatedAt: new Date(),
        },
      }),
      this.prisma.storyTranslationJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
    ]);

    return {
      locale: this.toLocaleDto(updatedLocale),
      job: this.toJobDto(completedJob),
    };
  }

  async getLocale(storyId: string, locale: string, userId: string): Promise<StoryLocaleDto> {
    await this.assertStoryAccess(storyId, userId);
    const row = await this.prisma.storyLocale.findUnique({
      where: { storyId_locale: { storyId, locale: locale.toLowerCase() } },
    });
    if (!row) throw new NotFoundException('Story locale not found');
    return this.toLocaleDto(row);
  }

  private async assertStoryAccess(storyId: string, userId: string) {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    const story = await this.prisma.familyStory.findFirst({
      where: {
        id: storyId,
        deletedAt: null,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.createdById !== userId) {
      const member = workspaceId
        ? await this.prisma.workspaceMember.findFirst({ where: { workspaceId, userId } })
        : null;
      if (!member || !['ADMIN', 'EDITOR'].includes(member.role)) {
        throw new ForbiddenException('Not allowed to translate this story');
      }
    }
    return story;
  }

  private toLocaleDto(row: {
    id: string;
    storyId: string;
    locale: string;
    sourceLocale: string;
    title: string | null;
    narrativeText: string | null;
    status: string;
    translatedAt: Date | null;
    updatedAt: Date;
  }): StoryLocaleDto {
    return {
      id: row.id,
      storyId: row.storyId,
      locale: row.locale,
      sourceLocale: row.sourceLocale,
      title: row.title,
      narrativeText: row.narrativeText,
      status: row.status.toLowerCase() as StoryLocaleDto['status'],
      translatedAt: row.translatedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toJobDto(row: {
    id: string;
    storyId: string;
    targetLocale: string;
    status: string;
    error: string | null;
    completedAt: Date | null;
    createdAt: Date;
  }): StoryTranslationJobDto {
    return {
      id: row.id,
      storyId: row.storyId,
      targetLocale: row.targetLocale,
      status: row.status.toLowerCase() as StoryTranslationJobDto['status'],
      error: row.error,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
