import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { CategorizedSearchResults, SearchDocument } from './search.types';

@Injectable()
export class SearchService {
  private readonly indexUid = 'family_search';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async search(q: string): Promise<CategorizedSearchResults> {
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

    return response.hits.reduce<CategorizedSearchResults>((acc, hit) => {
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
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person) return null;

    const document: SearchDocument = {
      id: `person:${person.id}`,
      category: 'people',
      entityId: person.id,
      title: [person.givenName, person.familyName].filter(Boolean).join(' '),
      text: person.biography ?? undefined,
      year: person.birthDate?.getUTCFullYear(),
      tags: ['person'],
    };

    await this.indexDocuments([document]);
    return document;
  }

  async indexDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return null;

    const searchDocument: SearchDocument = {
      id: `document:${document.id}`,
      category: 'documents',
      entityId: document.id,
      title: document.title,
      text: document.description ?? undefined,
      tags: ['document', document.mimeType],
    };

    await this.indexDocuments([searchDocument]);
    return searchDocument;
  }

  async indexDocuments(documents: SearchDocument[]) {
    await this.ensureIndex();
    return this.meiliRequest(`/indexes/${this.indexUid}/documents`, 'POST', documents);
  }

  private async buildIndexDocuments(): Promise<SearchDocument[]> {
    const [people, documents, places, sources] = await Promise.all([
      this.prisma.person.findMany({ take: 1000 }),
      this.prisma.document.findMany({ take: 1000 }),
      this.prisma.place.findMany({ take: 1000 }),
      this.prisma.source.findMany({ take: 1000 }),
    ]);

    return [
      ...people.map<SearchDocument>((person) => ({
        id: `person:${person.id}`,
        category: 'people',
        entityId: person.id,
        title: [person.givenName, person.familyName].filter(Boolean).join(' '),
        text: person.biography ?? undefined,
        year: person.birthDate?.getUTCFullYear(),
        tags: ['person', person.gender ?? 'unknown'],
      })),
      ...documents.map<SearchDocument>((document) => ({
        id: `document:${document.id}`,
        category: 'documents',
        entityId: document.id,
        title: document.title,
        text: document.description ?? undefined,
        tags: ['document', document.mimeType],
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
      })),
    ];
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
    await this.meiliRequest(`/indexes/${this.indexUid}/settings/filterable-attributes`, 'PUT', ['category']);
  }

  private async meiliRequest<T = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT',
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

    return response.json() as Promise<T>;
  }
}
