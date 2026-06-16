import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SearchFilters } from '@family/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { SearchPrivacyService } from './search-privacy.service';
import type {
  CategorizedSearchResults,
  FacetedSearchResponse,
  SearchDocument,
  SearchCategory,
} from './search.types';

@Injectable()
export class SearchService {
  private readonly indexUid = 'family_search';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly searchPrivacy: SearchPrivacyService,
  ) {}

  async search(q: string, user?: AuthenticatedUser): Promise<CategorizedSearchResults> {
    const result = await this.facetedSearch({ q }, user);
    return this.toCategorized(result);
  }

  async facetedSearch(
    input: {
      q: string;
      categories?: SearchCategory[];
      yearFrom?: number;
      yearTo?: number;
      tags?: string[];
      familyId?: string;
      sort?: 'relevance' | 'year_asc' | 'year_desc' | 'title';
      limit?: number;
    },
    user?: AuthenticatedUser,
    options?: { recordHistory?: boolean },
  ): Promise<FacetedSearchResponse> {
    const query = input.q.trim();
    const filters: SearchFilters = {
      categories: input.categories,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      tags: input.tags,
      familyId: input.familyId,
    };

    if (!query) {
      return {
        q: query,
        filters,
        facets: { categories: {}, years: {}, tags: {} },
        total: 0,
        hits: [],
      };
    }

    await this.ensureIndex();

    const filterParts: string[] = [];
    if (input.categories?.length) {
      const cats = input.categories.map((c) => `"${c}"`).join(', ');
      filterParts.push(`category IN [${cats}]`);
    }
    if (input.yearFrom !== undefined) filterParts.push(`year >= ${input.yearFrom}`);
    if (input.yearTo !== undefined) filterParts.push(`year <= ${input.yearTo}`);
    if (input.familyId) filterParts.push(`familyId = "${input.familyId}"`);

    const sort =
      input.sort === 'year_asc'
        ? ['year:asc']
        : input.sort === 'year_desc'
          ? ['year:desc']
          : input.sort === 'title'
            ? ['title:asc']
            : undefined;

    const response = await this.meiliRequest<{ hits: SearchDocument[]; estimatedTotalHits?: number }>(
      `/indexes/${this.indexUid}/search`,
      'POST',
      {
        q: query,
        limit: input.limit ?? 40,
        filter: filterParts.length ? filterParts.join(' AND ') : undefined,
        sort,
        facets: ['category', 'year', 'tags'],
      },
    );

    let visibleHits = await this.searchPrivacy.filterHits(response.hits, user);

    if (input.tags?.length) {
      const tagSet = new Set(input.tags.map((t) => t.toLowerCase()));
      visibleHits = visibleHits.filter((h) => h.tags?.some((t) => tagSet.has(t.toLowerCase())));
    }

    const facets = this.buildFacets(visibleHits);

    if (user && options?.recordHistory !== false) {
      const workspaceId = await this.resolveWorkspaceId(user);
      if (workspaceId) {
        await this.prisma.searchHistoryEntry.create({
          data: {
            workspaceId,
            userId: user.id,
            query,
            filters: filters as Prisma.InputJsonValue,
            resultCount: visibleHits.length,
          },
        });
      }
    }

    return {
      q: query,
      filters,
      facets,
      total: visibleHits.length,
      hits: visibleHits,
    };
  }

  async listSavedSearches(userId: string) {
    const rows = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      query: r.query,
      filters: (r.filters ?? undefined) as SearchFilters | undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createSavedSearch(userId: string, name: string, query: string, filters?: SearchFilters) {
    const workspaceId = await this.requireWorkspaceId(userId);
    const row = await this.prisma.savedSearch.create({
      data: {
        workspaceId,
        userId,
        name,
        query,
        filters: filters as Prisma.InputJsonValue | undefined,
      },
    });
    return {
      id: row.id,
      name: row.name,
      query: row.query,
      filters: (row.filters ?? undefined) as SearchFilters | undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateSavedSearch(userId: string, id: string, patch: { name?: string; query?: string; filters?: SearchFilters }) {
    const existing = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Saved search not found');
    const row = await this.prisma.savedSearch.update({
      where: { id },
      data: {
        name: patch.name,
        query: patch.query,
        filters: patch.filters as Prisma.InputJsonValue | undefined,
      },
    });
    return {
      id: row.id,
      name: row.name,
      query: row.query,
      filters: (row.filters ?? undefined) as SearchFilters | undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteSavedSearch(userId: string, id: string) {
    const existing = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Saved search not found');
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  async listSearchHistory(userId: string, limit = 30) {
    const rows = await this.prisma.searchHistoryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      query: r.query,
      filters: (r.filters ?? undefined) as SearchFilters | undefined,
      resultCount: r.resultCount ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async clearSearchHistory(userId: string) {
    await this.prisma.searchHistoryEntry.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async reindexAll() {
    await this.ensureIndex();
    const documents = await this.buildIndexDocuments();

    if (documents.length > 0) {
      await this.meiliRequest(`/indexes/${this.indexUid}/documents`, 'POST', documents);
    }

    return {
      indexUid: this.indexUid,
      indexed: documents.length,
      categories: ['people', 'documents', 'places', 'sources', 'wiki', 'evidence', 'memories', 'burials'],
    };
  }

  async indexPerson(personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, deletedAt: null } });
    if (!person) return null;

    if (person.privacyLevel === 'PRIVATE') {
      await this.deleteFromIndex(`person:${person.id}`);
      return null;
    }

    const document = this.personToSearchDocument(person);
    await this.indexDocuments([document]);
    return document;
  }

  async indexDocument(documentId: string) {
    const document = await this.prisma.document.findFirst({ where: { id: documentId, deletedAt: null } });
    if (!document) return null;

    if (document.privacyLevel === 'PRIVATE') {
      await this.deleteFromIndex(`document:${document.id}`);
      return null;
    }

    const searchDocument: SearchDocument = {
      id: `document:${document.id}`,
      category: 'documents',
      entityId: document.id,
      title: document.title,
      text: [document.description, document.ocrText].filter(Boolean).join('\n\n') || undefined,
      tags: ['document', document.mimeType],
      workspaceId: document.workspaceId,
      privacyLevel: document.privacyLevel.toLowerCase(),
    };

    await this.indexDocuments([searchDocument]);
    return searchDocument;
  }

  async indexSource(sourceId: string) {
    const source = await this.prisma.source.findFirst({ where: { id: sourceId, deletedAt: null } });
    if (!source) return null;

    const document: SearchDocument = {
      id: `source:${source.id}`,
      category: 'sources',
      entityId: source.id,
      title: source.title,
      text: [source.author, source.publication, source.repository, source.notes].filter(Boolean).join('\n'),
      tags: ['source'],
      workspaceId: source.workspaceId,
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexPlace(placeId: string) {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, deletedAt: null },
      include: {
        geoCountry: { select: { name: true, historicalName: true } },
        geoRegion: { select: { name: true } },
        geoCity: { select: { name: true, historicalName: true } },
      },
    });
    if (!place) return null;

    const geoParts = [
      place.geoCountry?.name,
      place.geoCountry?.historicalName,
      place.geoRegion?.name,
      place.geoCity?.name,
      place.geoCity?.historicalName,
    ].filter(Boolean);

    const document: SearchDocument = {
      id: `place:${place.id}`,
      category: 'places',
      entityId: place.id,
      title: place.name,
      text: [...geoParts, place.country, place.region, place.city].filter(Boolean).join(', '),
      tags: ['place'],
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexWikiPage(pageId: string) {
    const page = await this.prisma.wikiPage.findFirst({
      where: { id: pageId, deletedAt: null },
      include: {
        revisions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!page) return null;

    const latest = page.revisions[0];
    const document: SearchDocument = {
      id: `wiki:${page.id}`,
      category: 'wiki',
      entityId: page.id,
      title: page.title,
      text: latest?.content,
      tags: ['wiki', page.slug],
      workspaceId: page.workspaceId,
      familyId: page.familyId ?? undefined,
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexCitation(citationId: string) {
    const citation = await this.prisma.citation.findFirst({
      where: { id: citationId, deletedAt: null },
      include: { source: true, person: true, event: true },
    });
    if (!citation) return null;

    const document: SearchDocument = {
      id: `evidence:${citation.id}`,
      category: 'evidence',
      entityId: citation.id,
      title: citation.source.title,
      text: [citation.detail, citation.formattedCitation, citation.page].filter(Boolean).join('\n'),
      tags: ['evidence', 'citation'],
      workspaceId: citation.workspaceId,
      evidenceQuality: citation.qualityScore,
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexMemoryStory(memoryStoryId: string) {
    const story = await this.prisma.memoryStory.findFirst({
      where: { id: memoryStoryId, deletedAt: null },
      include: {
        media: { include: { mediaTranscript: true } },
      },
    });
    if (!story) return null;

    const transcriptText = story.media?.mediaTranscript?.text ?? '';
    const document: SearchDocument = {
      id: `memory:${story.id}`,
      category: 'memories',
      entityId: story.id,
      title: story.title,
      text: [transcriptText, story.summary, story.description].filter(Boolean).join('\n\n') || undefined,
      tags: ['memory', story.language],
      workspaceId: story.workspaceId,
      privacyLevel: 'family',
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexDocuments(documents: SearchDocument[]) {
    await this.ensureIndex();
    return this.meiliRequest(`/indexes/${this.indexUid}/documents`, 'POST', documents);
  }

  private async buildIndexDocuments(): Promise<SearchDocument[]> {
    const [people, documents, places, sources, wikiPages, citations, memoryStories, burialSites] = await Promise.all([
      this.prisma.person.findMany({
        where: { deletedAt: null, privacyLevel: { not: 'PRIVATE' } },
        take: 1000,
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null, privacyLevel: { not: 'PRIVATE' } },
        take: 1000,
      }),
      this.prisma.place.findMany({ where: { deletedAt: null }, take: 1000 }),
      this.prisma.source.findMany({ where: { deletedAt: null }, take: 1000 }),
      this.prisma.wikiPage.findMany({
        where: { deletedAt: null },
        include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
        take: 500,
      }),
      this.prisma.citation.findMany({
        where: { deletedAt: null },
        include: { source: true },
        take: 500,
      }),
      this.prisma.memoryStory.findMany({
        where: { deletedAt: null },
        include: { media: { include: { mediaTranscript: true } } },
        take: 500,
      }),
      this.prisma.burialSite.findMany({
        include: {
          person: { select: { givenName: true, familyName: true } },
          cemetery: { select: { name: true } },
        },
        take: 500,
      }),
    ]);

    return [
      ...people.map((person) => this.personToSearchDocument(person)),
      ...documents.map<SearchDocument>((document) => ({
        id: `document:${document.id}`,
        category: 'documents',
        entityId: document.id,
        title: document.title,
        text: [document.description, document.ocrText].filter(Boolean).join('\n\n') || undefined,
        tags: ['document', document.mimeType],
        workspaceId: document.workspaceId,
        privacyLevel: document.privacyLevel.toLowerCase(),
      })),
      ...places.map<SearchDocument>((place) => ({
        id: `place:${place.id}`,
        category: 'places',
        entityId: place.id,
        title: place.name,
        text: [place.country, place.region, place.city].filter(Boolean).join(', '),
        tags: ['place'],
      })),
      ...sources.map<SearchDocument>((source) => ({
        id: `source:${source.id}`,
        category: 'sources',
        entityId: source.id,
        title: source.title,
        text: [source.author, source.publication, source.repository, source.notes].filter(Boolean).join('\n'),
        tags: ['source'],
        workspaceId: source.workspaceId,
      })),
      ...wikiPages.map<SearchDocument>((page) => ({
        id: `wiki:${page.id}`,
        category: 'wiki',
        entityId: page.id,
        title: page.title,
        text: page.revisions[0]?.content,
        tags: ['wiki', page.slug],
        workspaceId: page.workspaceId,
        familyId: page.familyId ?? undefined,
      })),
      ...citations.map<SearchDocument>((citation) => ({
        id: `evidence:${citation.id}`,
        category: 'evidence',
        entityId: citation.id,
        title: citation.source.title,
        text: [citation.detail, citation.formattedCitation, citation.page].filter(Boolean).join('\n'),
        tags: ['evidence', 'citation'],
        workspaceId: citation.workspaceId,
        evidenceQuality: citation.qualityScore,
      })),
      ...memoryStories.map<SearchDocument>((story) => ({
        id: `memory:${story.id}`,
        category: 'memories',
        entityId: story.id,
        title: story.title,
        text: [story.media?.mediaTranscript?.text, story.summary, story.description]
          .filter(Boolean)
          .join('\n\n') || undefined,
        tags: ['memory', story.language],
        workspaceId: story.workspaceId,
        privacyLevel: 'family',
      })),
      ...burialSites.map<SearchDocument>((site) => ({
        id: `burial:${site.id}`,
        category: 'burials',
        entityId: site.id,
        title: site.plotLabel ?? site.cemetery.name,
        text: [
          site.plotLabel,
          site.person ? [site.person.givenName, site.person.familyName].filter(Boolean).join(' ') : null,
          site.cemetery.name,
          site.notes,
        ]
          .filter(Boolean)
          .join(' '),
        year: site.burialDate?.getUTCFullYear(),
        tags: ['burial', 'cemetery'],
        workspaceId: site.workspaceId,
      })),
    ];
  }

  private personToSearchDocument(person: {
    id: string;
    workspaceId: string;
    givenName: string;
    patronymic: string | null;
    familyName: string | null;
    biography: string | null;
    birthDate: Date | null;
    gender: string | null;
    privacyLevel: string;
    isLiving: boolean;
  }): SearchDocument {
    return {
      id: `person:${person.id}`,
      category: 'people',
      entityId: person.id,
      title: [person.givenName, person.patronymic, person.familyName].filter(Boolean).join(' '),
      text: person.biography ?? undefined,
      year: person.birthDate?.getUTCFullYear(),
      tags: ['person', person.gender ?? 'unknown'],
      workspaceId: person.workspaceId,
      privacyLevel: person.privacyLevel.toLowerCase(),
      isLiving: person.isLiving,
    };
  }

  private buildFacets(hits: SearchDocument[]) {
    const categories: Record<string, number> = {};
    const years: Record<string, number> = {};
    const tags: Record<string, number> = {};

    for (const hit of hits) {
      categories[hit.category] = (categories[hit.category] ?? 0) + 1;
      if (hit.year) years[String(hit.year)] = (years[String(hit.year)] ?? 0) + 1;
      for (const tag of hit.tags ?? []) {
        tags[tag] = (tags[tag] ?? 0) + 1;
      }
    }

    return { categories, years, tags };
  }

  private toCategorized(result: FacetedSearchResponse): CategorizedSearchResults {
    const empty: CategorizedSearchResults = {
      q: result.q,
      people: [],
      documents: [],
      places: [],
      sources: [],
      wiki: [],
      evidence: [],
      memories: [],
      burials: [],
    };
    for (const hit of result.hits) {
      if (hit.category in empty) {
        (empty as Record<string, SearchDocument[]>)[hit.category]?.push(hit);
      }
    }
    return empty;
  }

  private async deleteFromIndex(documentId: string) {
    await this.ensureIndex();
    await this.meiliRequest(`/indexes/${this.indexUid}/documents/${encodeURIComponent(documentId)}`, 'DELETE', undefined, true);
  }

  private async ensureIndex() {
    const exists = await this.meiliRequest(`/indexes/${this.indexUid}`, 'GET', undefined, true);
    if (exists) {
      await this.meiliRequest(`/indexes/${this.indexUid}/settings/filterable-attributes`, 'PUT', [
        'category',
        'workspaceId',
        'privacyLevel',
        'year',
        'familyId',
        'tags',
        'evidenceQuality',
      ]);
      await this.meiliRequest(`/indexes/${this.indexUid}/settings/sortable-attributes`, 'PUT', [
        'year',
        'title',
        'evidenceQuality',
      ]);
      return;
    }

    await this.meiliRequest('/indexes', 'POST', { uid: this.indexUid, primaryKey: 'id' });
    await this.meiliRequest(`/indexes/${this.indexUid}/settings/filterable-attributes`, 'PUT', [
      'category',
      'workspaceId',
      'privacyLevel',
      'year',
      'familyId',
      'tags',
      'evidenceQuality',
    ]);
    await this.meiliRequest(`/indexes/${this.indexUid}/settings/sortable-attributes`, 'PUT', [
      'year',
      'title',
      'evidenceQuality',
    ]);
  }

  private async resolveWorkspaceId(user: AuthenticatedUser) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    return member?.workspaceId ?? null;
  }

  private async requireWorkspaceId(userId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    });
    if (!member) throw new NotFoundException('Workspace not found for user');
    return member.workspaceId;
  }

  private async meiliRequest<T = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
    allowNotFound = false,
  ): Promise<T> {
    const host = this.config.get<string>('MEILI_HOST') ?? 'http://localhost:7700';
    const key = this.config.get<string>('MEILI_MASTER_KEY');

    if (!key) {
      throw new ServiceUnavailableException('Meilisearch master key is not configured');
    }

    const response = await fetch(`${host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (allowNotFound && response.status === 404) {
      return null as T;
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`Meilisearch ${response.status}: ${await response.text()}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }
}
