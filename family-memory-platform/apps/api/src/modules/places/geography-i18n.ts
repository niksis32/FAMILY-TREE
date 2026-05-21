import { GeoEntityType } from '@prisma/client';
import { DEFAULT_APP_LOCALE, type AppLocale, normalizeAppLocale } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';

export function resolveRequestLocale(queryLang?: string, acceptLanguage?: string): AppLocale {
  if (queryLang?.trim()) return normalizeAppLocale(queryLang);
  if (acceptLanguage?.trim()) {
    const first = acceptLanguage.split(',')[0]?.split(';')[0]?.trim();
    return normalizeAppLocale(first);
  }
  return DEFAULT_APP_LOCALE;
}

type NameResolver = (entityId: string, canonical: string) => string;

export async function buildNameResolver(
  prisma: PrismaService,
  entityType: GeoEntityType,
  entityIds: string[],
  locale: AppLocale,
): Promise<NameResolver> {
  const uniqueIds = [...new Set(entityIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return (_id, canonical) => canonical;
  }

  const locales =
    locale === DEFAULT_APP_LOCALE ? [DEFAULT_APP_LOCALE] : [locale, DEFAULT_APP_LOCALE];

  const rows = await prisma.geographicName.findMany({
    where: { entityType, entityId: { in: uniqueIds }, locale: { in: locales } },
    select: { entityId: true, locale: true, name: true, isPreferred: true },
  });

  const byEntity = new Map<string, { primary?: string; fallback?: string }>();

  for (const row of rows) {
    const entry = byEntity.get(row.entityId) ?? {};
    if (row.locale === locale) {
      if (!entry.primary || row.isPreferred) entry.primary = row.name;
    } else if (row.locale === DEFAULT_APP_LOCALE) {
      if (!entry.fallback || row.isPreferred) entry.fallback = row.name;
    }
    byEntity.set(row.entityId, entry);
  }

  return (entityId, canonical) => {
    const entry = byEntity.get(entityId);
    return entry?.primary ?? entry?.fallback ?? canonical;
  };
}

export function applyCountryNames<T extends { id: string; name: string }>(
  rows: T[],
  resolve: NameResolver,
): T[] {
  return rows.map((row) => ({ ...row, name: resolve(row.id, row.name) }));
}

export function applyRegionNames<T extends { id: string; name: string }>(
  rows: T[],
  resolve: NameResolver,
): T[] {
  return rows.map((row) => ({ ...row, name: resolve(row.id, row.name) }));
}

export function applyCityNames<
  T extends {
    id: string;
    name: string;
    country?: { id: string; name: string } | null;
    region?: { id: string; name: string } | null;
  },
>(
  rows: T[],
  resolveCity: NameResolver,
  resolveCountry?: NameResolver,
  resolveRegion?: NameResolver,
): T[] {
  return rows.map((row) => ({
    ...row,
    name: resolveCity(row.id, row.name),
    country: row.country
      ? {
          ...row.country,
          name: resolveCountry ? resolveCountry(row.country.id, row.country.name) : row.country.name,
        }
      : row.country,
    region: row.region
      ? {
          ...row.region,
          name: resolveRegion ? resolveRegion(row.region.id, row.region.name) : row.region.name,
        }
      : row.region,
  }));
}
