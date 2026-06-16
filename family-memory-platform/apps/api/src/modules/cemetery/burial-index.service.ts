import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BURIALS_INDEX_UID } from '@family/shared';

export type BurialIndexDocument = {
  id: string;
  burialSiteId: string;
  workspaceId: string;
  cemeteryId: string;
  cemeteryName: string;
  plotLabel: string | null;
  personDisplayName: string | null;
  personId: string | null;
  latitude: number | null;
  longitude: number | null;
  burialYear: number | null;
  text: string;
};

@Injectable()
export class BurialIndexService {
  private readonly logger = new Logger(BurialIndexService.name);
  private readonly indexUid = BURIALS_INDEX_UID;

  constructor(private readonly config: ConfigService) {}

  async ensureIndex() {
    try {
      await this.meiliRequest('GET', `/indexes/${this.indexUid}`);
    } catch {
      await this.meiliRequest('POST', '/indexes', { uid: this.indexUid, primaryKey: 'id' });
      await this.meiliRequest('PATCH', `/indexes/${this.indexUid}/settings`, {
        searchableAttributes: ['plotLabel', 'personDisplayName', 'cemeteryName', 'text'],
        filterableAttributes: ['workspaceId', 'cemeteryId', 'burialYear'],
        sortableAttributes: ['burialYear', 'cemeteryName'],
      });
    }
  }

  async upsert(doc: BurialIndexDocument) {
    await this.ensureIndex();
    await this.meiliRequest('POST', `/indexes/${this.indexUid}/documents`, [doc]);
    return doc;
  }

  async remove(burialSiteId: string) {
    await this.ensureIndex();
    await this.meiliRequest('DELETE', `/indexes/${this.indexUid}/documents/${burialSiteId}`);
  }

  async search(workspaceId: string, q: string, limit = 25) {
    await this.ensureIndex();
    const response = await this.meiliRequest<{ hits: BurialIndexDocument[] }>(
      'POST',
      `/indexes/${this.indexUid}/search`,
      {
        q: q.trim() || '*',
        filter: `workspaceId = "${workspaceId}"`,
        limit,
      },
    );
    return response.hits ?? [];
  }

  private async meiliRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const host = this.config.get<string>('MEILI_HOST') ?? 'http://localhost:7700';
    const key = this.config.get<string>('MEILI_MASTER_KEY');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;

    const res = await fetch(`${host}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Meilisearch ${method} ${path}: ${res.status} ${text}`);
      throw new ServiceUnavailableException('Burials search index is unavailable');
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }
}
