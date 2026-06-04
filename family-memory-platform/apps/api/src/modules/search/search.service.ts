import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { SearchPrivacyService } from './search-privacy.service';
import type { CategorizedSearchResults, SearchDocument } from './search.types';

@Injectable()
export class SearchService {
  private readonly indexUid = 'family_search';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly searchPrivacy: SearchPrivacyService,
  ) {}

  async search(q: string, user?: AuthenticatedUser): Promise<CategorizedSearchResults> {
    const query = q.trim();
    if (!query) {
      return this.emptyResults(query);
    }

    await this.ensureIndex();

    const response = await this.meiliRequest<{ hits: SearchDocument[] }>(
      `/indexes/${this.indexUid}/search`,
      'POST',
      { q: query, limit: 40 },
    );

    const visibleHits = await this.searchPrivacy.filterHits(response.hits, user);

    return visibleHits.reduce<CategorizedSearchResults>((acc, hit) => {
      acc[hit.category].push(hit);
      return acc;
    }, this.emptyResults(query));
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
      categories: ['people', 'documents', 'places', 'sources'],
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
      text: document.description ?? undefined,
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

  async indexDocuments(documents: SearchDocument[]) {
    await this.ensureIndex();
    return this.meiliRequest(`/indexes/${this.indexUid}/documents`, 'POST', documents);
  }

  private async buildIndexDocuments(): Promise<SearchDocument[]> {
    const [people, documents, places, sources] = await Promise.all([
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
    ]);

    return [
      ...people.map((person) => this.personToSearchDocument(person)),
      ...documents.map<SearchDocument>((document) => ({
        id: `document:${document.id}`,
        category: 'documents',
        entityId: document.id,
        title: document.title,
        text: document.description ?? undefined,
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

  private async deleteFromIndex(documentId: string) {
    await this.ensureIndex();
    await this.meiliRequest(`/indexes/${this.indexUid}/documents/${encodeURIComponent(documentId)}`, 'DELETE', undefined, true);
  }

  private emptyResults(q: string): CategorizedSearchResults {
    return { q, people: [], documents: [], places: [], sources: [] };
  }

  private async ensureIndex() {
    const exists = await this.meiliRequest(`/indexes/${this.indexUid}`, 'GET', undefined, true);
    if (exists) {
      return;
    }

    await this.meiliRequest('/indexes', 'POST', { uid: this.indexUid, primaryKey: 'id' });
    await this.meiliRequest(`/indexes/${this.indexUid}/settings/filterable-attributes`, 'PUT', [
      'category',
      'workspaceId',
      'privacyLevel',
    ]);
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
