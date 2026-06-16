import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { WikiPageSummary } from '@family/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { ActivityRecorderService } from '../activity-feed/activity-recorder.service';
import { SearchService } from '../search/search.service';
import type { CreateWikiPageDto, CreateWikiRevisionDto, UpdateWikiPageDto } from './wiki.dto';

@Injectable()
export class WikiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly activity: ActivityRecorderService,
  ) {}

  async list(familyId?: string): Promise<WikiPageSummary[]> {
    const rows = await this.prisma.wikiPage.findMany({
      where: { deletedAt: null, ...(familyId ? { familyId } : {}) },
      include: {
        revisions: { orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.toSummary(r));
  }

  async getBySlug(slug: string) {
    const page = await this.prisma.wikiPage.findFirst({
      where: { slug, deletedAt: null },
      include: {
        revisions: { orderBy: { version: 'desc' } },
        linksFrom: true,
      },
    });
    if (!page) throw new NotFoundException('Wiki page not found');
    return {
      ...this.toSummary(page),
      revisions: page.revisions.map((rev) => ({
        id: rev.id,
        version: rev.version,
        content: rev.content,
        authorUserId: rev.authorUserId,
        createdAt: rev.createdAt.toISOString(),
      })),
      links: page.linksFrom.map((l) => ({
        id: l.id,
        fromPageId: l.fromPageId,
        toPageId: l.toPageId,
        toEntityType: l.toEntityType,
        toEntityId: l.toEntityId,
      })),
    };
  }

  async create(dto: CreateWikiPageDto, authorUserId: string) {
    const slug = dto.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await this.prisma.wikiPage.findFirst({ where: { slug, deletedAt: null } });
    if (existing) throw new ConflictException('Wiki slug already exists');

    const page = await this.prisma.wikiPage.create({
      data: workspaceScopedCreateData<Prisma.WikiPageUncheckedCreateInput>({
        familyId: dto.familyId,
        slug,
        title: dto.title,
        revisions: {
          create: {
            version: 1,
            content: dto.content,
            authorUserId,
          },
        },
      }),
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    await this.syncLinks(page.id, page.workspaceId, dto.content);
    await this.search.indexWikiPage(page.id);
    await this.activity.record({
      workspaceId: page.workspaceId,
      actorUserId: authorUserId,
      type: 'CUSTOM',
      summary: `Создана wiki-страница: ${page.title}`,
      deepLink: `/wiki/${page.slug}`,
      entityType: 'wiki_page',
      entityId: page.id,
    });

    return this.toSummary(page);
  }

  async update(id: string, dto: UpdateWikiPageDto, authorUserId: string) {
    const page = await this.prisma.wikiPage.findFirst({
      where: { id, deletedAt: null },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!page) throw new NotFoundException('Wiki page not found');

    const nextVersion = (page.revisions[0]?.version ?? 0) + 1;
    const updated = await this.prisma.wikiPage.update({
      where: { id },
      data: {
        title: dto.title ?? page.title,
        familyId: dto.familyId ?? page.familyId,
        revisions: dto.content
          ? {
              create: {
                version: nextVersion,
                content: dto.content,
                authorUserId,
              },
            }
          : undefined,
      },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (dto.content) {
      await this.syncLinks(page.id, page.workspaceId, dto.content);
      await this.search.indexWikiPage(page.id);
      await this.activity.record({
        workspaceId: page.workspaceId,
        actorUserId: authorUserId,
        type: 'CUSTOM',
        summary: `Обновлена wiki-страница: ${updated.title} (v${nextVersion})`,
        deepLink: `/wiki/${updated.slug}`,
        entityType: 'wiki_page',
        entityId: updated.id,
        metadata: { version: nextVersion },
      });
    }

    return this.toSummary(updated);
  }

  async addRevision(pageId: string, dto: CreateWikiRevisionDto, authorUserId: string) {
    const page = await this.prisma.wikiPage.findFirst({
      where: { id: pageId, deletedAt: null },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!page) throw new NotFoundException('Wiki page not found');

    const nextVersion = (page.revisions[0]?.version ?? 0) + 1;
    await this.prisma.wikiRevision.create({
      data: {
        wikiPageId: pageId,
        version: nextVersion,
        content: dto.content,
        authorUserId,
      },
    });

    await this.prisma.wikiPage.update({ where: { id: pageId }, data: { updatedAt: new Date() } });
    await this.syncLinks(pageId, page.workspaceId, dto.content);
    await this.search.indexWikiPage(pageId);

    return { wikiPageId: pageId, version: nextVersion };
  }

  async remove(id: string) {
    const page = await this.prisma.wikiPage.findFirst({ where: { id, deletedAt: null } });
    if (!page) throw new NotFoundException('Wiki page not found');
    await this.prisma.wikiPage.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  private async syncLinks(pageId: string, workspaceId: string, content: string) {
    await this.prisma.wikiLink.deleteMany({ where: { fromPageId: pageId } });

    const wikiLinks = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim());
    const personLinks = [...content.matchAll(/@person:([a-z0-9]+)/gi)].map((m) => m[1]);

    for (const slug of wikiLinks) {
      const target = await this.prisma.wikiPage.findFirst({
        where: { slug: slug.toLowerCase(), deletedAt: null },
      });
      await this.prisma.wikiLink.create({
        data: {
          workspaceId,
          fromPageId: pageId,
          toPageId: target?.id,
          toEntityType: target ? undefined : 'wiki_slug',
          toEntityId: target ? undefined : slug,
        },
      });
    }

    for (const personId of personLinks) {
      await this.prisma.wikiLink.create({
        data: {
          workspaceId,
          fromPageId: pageId,
          toEntityType: 'person',
          toEntityId: personId,
        },
      });
    }
  }

  private toSummary(page: {
    id: string;
    slug: string;
    title: string;
    familyId: string | null;
    createdAt: Date;
    updatedAt: Date;
    revisions?: Array<{
      id: string;
      version: number;
      content: string;
      authorUserId: string | null;
      createdAt: Date;
    }>;
  }): WikiPageSummary {
    const latest = page.revisions?.[0];
    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      familyId: page.familyId,
      latestRevision: latest
        ? {
            id: latest.id,
            version: latest.version,
            content: latest.content,
            authorUserId: latest.authorUserId,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }
}
