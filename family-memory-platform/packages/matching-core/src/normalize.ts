/** Cyrillic/Latin fold + strip punctuation for name comparison. */
export function normalizeToken(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

export function buildFullName(parts: {
  givenName?: string | null;
  patronymic?: string | null;
  familyName?: string | null;
}): string {
  return [parts.givenName, parts.patronymic, parts.familyName].filter(Boolean).join(' ').trim();
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const tokensA = new Set(na.split(' '));
  const tokensB = new Set(nb.split(' '));
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? overlap / union : 0;
}

export function birthYearBucket(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const y = new Date(isoDate).getUTCFullYear();
  if (Number.isNaN(y)) return null;
  const bucket = Math.floor(y / 5) * 5;
  return String(bucket);
}
