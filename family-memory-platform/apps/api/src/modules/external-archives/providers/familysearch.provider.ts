import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  ExternalArchiveProviderId,
  ExternalArchiveRecordSummary,
  ExternalArchiveSearchParams,
} from '@family/shared';
import type { ExternalRecordProvider } from './external-record.provider';
import { resolveFamilySearchAccessToken } from './familysearch-token';

const FAMILYSEARCH_ATTRIBUTION =
  'Courtesy of FamilySearch.org. Record images and indexes are subject to FamilySearch Terms of Use.';

const MOCK_RECORDS: ExternalArchiveRecordSummary[] = [
  {
    id: 'FS-MOCK-1842-001',
    provider: 'FAMILYSEARCH',
    title: 'Birth: Ivan Petrov, Moscow, 1842',
    givenName: 'Ivan',
    familyName: 'Petrov',
    birthDate: '1842-03-12',
    place: 'Moscow, Russian Empire',
    recordType: 'birth',
    url: 'https://www.familysearch.org/ark:/61903/1:1:MOCK-1842-001',
    attributionText: FAMILYSEARCH_ATTRIBUTION,
  },
  {
    id: 'FS-MOCK-1871-002',
    provider: 'FAMILYSEARCH',
    title: 'Marriage: Ivan Petrov & Maria Sokolova, 1871',
    givenName: 'Ivan',
    familyName: 'Petrov',
    birthDate: '1842',
    place: 'Tver, Russian Empire',
    recordType: 'marriage',
    url: 'https://www.familysearch.org/ark:/61903/1:1:MOCK-1871-002',
    attributionText: FAMILYSEARCH_ATTRIBUTION,
  },
  {
    id: 'FS-MOCK-1898-003',
    provider: 'FAMILYSEARCH',
    title: 'Death: Maria Sokolova, St. Petersburg, 1898',
    givenName: 'Maria',
    familyName: 'Sokolova',
    deathDate: '1898-11-04',
    place: 'St. Petersburg, Russian Empire',
    recordType: 'death',
    url: 'https://www.familysearch.org/ark:/61903/1:1:MOCK-1898-003',
    attributionText: FAMILYSEARCH_ATTRIBUTION,
  },
];

function matchesQuery(record: ExternalArchiveRecordSummary, params: ExternalArchiveSearchParams): boolean {
  const given = params.givenName?.trim().toLowerCase();
  const family = params.familyName?.trim().toLowerCase();
  const place = params.place?.trim().toLowerCase();

  if (given && !record.givenName?.toLowerCase().includes(given)) return false;
  if (family && !record.familyName?.toLowerCase().includes(family)) return false;
  if (place && !record.place?.toLowerCase().includes(place)) return false;
  if (params.birthYear && record.birthDate && !record.birthDate.startsWith(String(params.birthYear))) return false;
  if (params.deathYear && record.deathDate && !record.deathDate.startsWith(String(params.deathYear))) return false;
  if (params.recordType && record.recordType !== params.recordType) return false;
  return true;
}

type GedcomxPerson = {
  names?: Array<{
    nameForms?: Array<{ fullText?: string; parts?: Array<{ type?: string; value?: string }> }>;
  }>;
  facts?: Array<{ type?: string; date?: { original?: string }; place?: { original?: string } }>;
};

function parseGedcomxEntry(entry: {
  id?: string;
  title?: { value?: string };
  content?: { gedcomx?: { persons?: GedcomxPerson[] } };
}): ExternalArchiveRecordSummary {
  const person = entry.content?.gedcomx?.persons?.[0];
  const nameForm = person?.names?.[0]?.nameForms?.[0];
  const fullName = nameForm?.fullText ?? entry.title?.value ?? 'FamilySearch record';
  const givenPart = nameForm?.parts?.find((p) => p.type === 'http://gedcomx.org/Given')?.value;
  const familyPart = nameForm?.parts?.find((p) => p.type === 'http://gedcomx.org/Surname')?.value;
  const birthFact = person?.facts?.find((f) => f.type?.includes('Birth'));
  const deathFact = person?.facts?.find((f) => f.type?.includes('Death'));
  const recordId = entry.id?.split('/').pop() ?? crypto.randomUUID();

  return {
    id: recordId,
    provider: 'FAMILYSEARCH',
    title: fullName,
    givenName: givenPart,
    familyName: familyPart,
    birthDate: birthFact?.date?.original,
    deathDate: deathFact?.date?.original,
    place: birthFact?.place?.original ?? deathFact?.place?.original,
    recordType: deathFact ? 'death' : birthFact ? 'birth' : undefined,
    attributionText: FAMILYSEARCH_ATTRIBUTION,
    url: `https://www.familysearch.org/ark:/61903/1:1:${recordId}`,
  };
}

@Injectable()
export class FamilySearchProvider implements ExternalRecordProvider {
  private readonly logger = new Logger(FamilySearchProvider.name);

  readonly meta = {
    id: 'FAMILYSEARCH' as ExternalArchiveProviderId,
    label: 'FamilySearch',
    termsUrl: 'https://www.familysearch.org/en/legal/terms',
    attributionTemplate: FAMILYSEARCH_ATTRIBUTION,
  };

  async isDevMode(): Promise<boolean> {
    const token = await resolveFamilySearchAccessToken();
    return !token;
  }

  async search(params: ExternalArchiveSearchParams): Promise<ExternalArchiveRecordSummary[]> {
    const token = await resolveFamilySearchAccessToken();
    if (!token) {
      return MOCK_RECORDS.filter((record) => matchesQuery(record, params));
    }

    const url = new URL('https://api.familysearch.org/platform/records/personas');
    if (params.givenName) url.searchParams.set('qGivenName', params.givenName);
    if (params.familyName) url.searchParams.set('qSurname', params.familyName);
    if (params.birthYear) url.searchParams.set('qBirthLikeDate', String(params.birthYear));
    if (params.deathYear) url.searchParams.set('qDeathLikeDate', String(params.deathYear));
    if (params.place) url.searchParams.set('qAnyPlace', params.place);
    url.searchParams.set('count', '25');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/x-gedcomx-atom+json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('FamilySearch auth failed — falling back to mock records');
        return MOCK_RECORDS.filter((record) => matchesQuery(record, params));
      }

      if (response.status === 429) {
        this.logger.warn('FamilySearch rate limited — falling back to mock records');
        return MOCK_RECORDS.filter((record) => matchesQuery(record, params));
      }

      if (!response.ok) {
        throw new Error(`FamilySearch API error: ${response.status}`);
      }

      const payload = (await response.json()) as {
        entries?: Array<{
          id?: string;
          title?: { value?: string };
          content?: { gedcomx?: { persons?: GedcomxPerson[] } };
        }>;
      };

      return (payload.entries ?? []).map(parseGedcomxEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FamilySearch search failed';
      this.logger.warn(`${message} — using mock fallback`);
      return MOCK_RECORDS.filter((record) => matchesQuery(record, params));
    }
  }

  async getRecord(recordId: string): Promise<ExternalArchiveRecordSummary> {
    const token = await resolveFamilySearchAccessToken();
    if (!token) {
      const record = MOCK_RECORDS.find((row) => row.id === recordId);
      if (!record) throw new NotFoundException('External archive record not found');
      return record;
    }

    try {
      const response = await fetch(`https://api.familysearch.org/platform/records/personas/${recordId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/x-gedcomx-atom+json',
        },
      });

      if (!response.ok) {
        throw new NotFoundException('External archive record not found');
      }

      const payload = (await response.json()) as {
        id?: string;
        title?: { value?: string };
        content?: { gedcomx?: { persons?: GedcomxPerson[] } };
      };
      return parseGedcomxEntry(payload);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const mock = MOCK_RECORDS.find((row) => row.id === recordId);
      if (mock) return mock;
      throw new NotFoundException('External archive record not found');
    }
  }
}
