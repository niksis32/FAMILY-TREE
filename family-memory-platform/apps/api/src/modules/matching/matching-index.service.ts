import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MATCHING_INDEX_UID } from '@family/shared';
import { buildBlockingKey, buildMatchIndexDocument } from '@family/matching-core';
import type { PersonMatchSnapshot } from '@family/matching-core';

interface MatchIndexDocument {
  id: string;
  personId: string;
  workspaceId: string;
  blockingKey: string;
  fullName: string;
  birthYear: number | null;
  deathYear: number | null;
  placeHint: string | null;
}

@Injectable()
export class MatchingIndexService {
  private readonly logger = new Logger(MatchingIndexService.name);
  private readonly indexUid = MATCHING_INDEX_UID;

  constructor(private readonly config: ConfigService) {}

  async ensureIndex() {
    try {
      await this.meiliRequest('GET', `/indexes/${this.indexUid}`);
    } catch {
      await this.meiliRequest('POST', '/indexes', {
        uid: this.indexUid,
        primaryKey: 'id',
      });
      await this.meiliRequest('PATCH', `/indexes/${this.indexUid}/settings`, {
        searchableAttributes: ['fullName', 'blockingKey', 'placeHint'],
        filterableAttributes: ['workspaceId', 'blockingKey', 'birthYear'],
      });
    }
  }

  async upsertPerson(person: PersonMatchSnapshot & { workspaceId: string }) {
    await this.ensureIndex();
    const doc = buildMatchIndexDocument(person) as MatchIndexDocument;
    await this.meiliRequest('POST', `/indexes/${this.indexUid}/documents`, [doc]);
    return doc;
  }

  async removePerson(personId: string) {
    await this.ensureIndex();
    await this.meiliRequest('DELETE', `/indexes/${this.indexUid}/documents/${personId}`);
  }

  async findCandidatesByBlocking(
    snapshot: PersonMatchSnapshot,
    excludeWorkspaceId: string,
    limit = 40,
  ): Promise<MatchIndexDocument[]> {
    await this.ensureIndex();
    const blockingKey = buildBlockingKey(snapshot);
    const filter = `blockingKey = "${blockingKey}" AND workspaceId != "${excludeWorkspaceId}"`;
    const response = await this.meiliRequest<{ hits: MatchIndexDocument[] }>(
      'POST',
      `/indexes/${this.indexUid}/search`,
      { q: snapshot.givenName, filter, limit },
    );
    return response.hits ?? [];
  }

  private async meiliRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const host = this.config.get<string>('MEILI_HOST') ?? 'http://localhost:7700';
    const key = this.config.get<string>('MEILI_MASTER_KEY');
    const url = `${host}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Meilisearch ${method} ${path}: ${res.status} ${text}`);
      throw new ServiceUnavailableException('Matching search index is unavailable');
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }
}
