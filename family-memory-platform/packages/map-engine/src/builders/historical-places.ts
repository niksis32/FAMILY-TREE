import type { MapHistoricalAlias } from '@family/shared';

export interface HistoricalPlaceMarker {
  aliasId: string;
  cityId: string;
  cityName: string;
  oldName: string;
  displayLabel: string;
  longitude: number;
  latitude: number;
  fromYear?: number | null;
  toYear?: number | null;
}

export function buildHistoricalPlaceMarkers(aliases: MapHistoricalAlias[]): HistoricalPlaceMarker[] {
  return aliases
    .filter((a) => a.latitude != null && a.longitude != null)
    .map((alias) => ({
      aliasId: alias.id,
      cityId: alias.cityId,
      cityName: alias.cityName,
      oldName: alias.oldName,
      displayLabel: alias.oldName,
      longitude: alias.longitude!,
      latitude: alias.latitude!,
      fromYear: alias.fromYear,
      toYear: alias.toYear,
    }));
}

export function resolveHistoricalName(
  aliases: MapHistoricalAlias[],
  cityId: string | null | undefined,
  year?: number | null,
): string | null {
  if (!cityId) return null;
  const cityAliases = aliases.filter((a) => a.cityId === cityId);
  if (cityAliases.length === 0) return null;
  if (year == null) return cityAliases[0]!.oldName;
  const matched = cityAliases.find((a) => {
    const fromOk = a.fromYear == null || year >= a.fromYear;
    const toOk = a.toYear == null || year <= a.toYear;
    return fromOk && toOk;
  });
  return matched?.oldName ?? cityAliases[0]!.oldName;
}
