export type DnaProviderId =
  | 'TWENTY_THREE_AND_ME'
  | 'ANCESTRY'
  | 'MYHERITAGE'
  | 'UNKNOWN';

export type ParsedDnaFile = {
  provider: DnaProviderId;
  snpCount: number;
};

const PROVIDER_HEADER_PATTERNS: Array<{ pattern: RegExp; provider: DnaProviderId }> = [
  { pattern: /23andme/i, provider: 'TWENTY_THREE_AND_ME' },
  { pattern: /ancestry/i, provider: 'ANCESTRY' },
  { pattern: /myheritage/i, provider: 'MYHERITAGE' },
];

/** Parse raw SNP text export — genealogy matching only, no trait/health fields. */
export function parseDnaFileContent(content: string): ParsedDnaFile {
  const lines = content.split(/\r?\n/);
  let provider: DnaProviderId = 'UNKNOWN';
  let snpCount = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      for (const entry of PROVIDER_HEADER_PATTERNS) {
        if (entry.pattern.test(line)) provider = entry.provider;
      }
      continue;
    }
    const cols = line.split(/\t/);
    if (cols.length >= 4 && cols[0] && !cols[0].startsWith('#')) {
      snpCount += 1;
    }
  }

  return { provider, snpCount };
}
