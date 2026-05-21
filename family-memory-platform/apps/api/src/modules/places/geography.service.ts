import { BadRequestException, Injectable } from '@nestjs/common';
import { GeoEntityType, Prisma } from '@prisma/client';
import { type AppLocale, DEFAULT_APP_LOCALE } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  applyCityNames,
  applyCountryNames,
  applyRegionNames,
  buildNameResolver,
} from './geography-i18n';
import { centuryToYearRange, isRuGeoZone, periodOverlapFilter, RU_GEO_ZONE_ISO2 } from './geography.utils';

@Injectable()
export class GeographyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Country ids for region/city lists.
   * RU + SU: империя, СССР, РФ и GeoNames-RU — общая зона (регионы импорта привязаны к RU).
   */
  private async countryIdsForScope(countryId: string) {
    const country = await this.prisma.country.findUnique({
      where: { id: countryId.trim() },
      select: { id: true, iso2: true },
    });
    if (!country) return [countryId.trim()];

    if (!country.iso2) return [country.id];

    const iso2Filter = isRuGeoZone(country.iso2) ? { in: [...RU_GEO_ZONE_ISO2] } : country.iso2;

    const related = await this.prisma.country.findMany({
      where: { iso2: iso2Filter },
      select: { id: true },
    });
    const ids = related.map((item) => item.id);
    return ids.length ? ids : [country.id];
  }

  async listCountries(century?: string, locale: AppLocale = DEFAULT_APP_LOCALE) {
    const range = century ? centuryToYearRange(century) : null;
    const where: Prisma.CountryWhereInput = range ? periodOverlapFilter(range.from, range.to) : {};

    const rows = await this.prisma.country.findMany({
      where,
      orderBy: [{ name: 'asc' }, { periodFrom: 'asc' }],
      take: 500,
    });

    const resolve = await buildNameResolver(
      this.prisma,
      GeoEntityType.COUNTRY,
      rows.map((r) => r.id),
      locale,
    );
    return applyCountryNames(rows, resolve);
  }

  async listRegions(countryId: string, century?: string, locale: AppLocale = DEFAULT_APP_LOCALE) {
    if (!countryId?.trim()) throw new BadRequestException('countryId is required');

    const range = century ? centuryToYearRange(century) : null;
    const countryIds = await this.countryIdsForScope(countryId);
    const where: Prisma.RegionWhereInput = {
      countryId: { in: countryIds },
      ...(range ? periodOverlapFilter(range.from, range.to) : {}),
    };

    const rows = await this.prisma.region.findMany({
      where,
      orderBy: [{ name: 'asc' }, { periodFrom: 'asc' }],
      take: 2000,
    });

    const resolve = await buildNameResolver(
      this.prisma,
      GeoEntityType.REGION,
      rows.map((r) => r.id),
      locale,
    );
    return applyRegionNames(rows, resolve);
  }

  async listCities(
    countryId: string,
    regionId?: string,
    century?: string,
    locale: AppLocale = DEFAULT_APP_LOCALE,
  ) {
    if (!countryId?.trim()) throw new BadRequestException('countryId is required');

    const range = century ? centuryToYearRange(century) : null;
    const countryIds = await this.countryIdsForScope(countryId);
    const where: Prisma.CityWhereInput = {
      countryId: { in: countryIds },
      ...(regionId?.trim() ? { regionId: regionId.trim() } : {}),
      ...(range ? periodOverlapFilter(range.from, range.to) : {}),
    };

    const rows = await this.prisma.city.findMany({
      where,
      include: {
        aliases: { orderBy: { fromYear: 'asc' } },
        country: { select: { id: true, name: true, historicalName: true, iso2: true } },
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ population: 'desc' }, { name: 'asc' }],
      take: 5000,
    });

    const cityIds = rows.map((r) => r.id);
    const countryIdList = rows.map((r) => r.country?.id).filter(Boolean) as string[];
    const regionIds = rows.map((r) => r.region?.id).filter(Boolean) as string[];

    const [resolveCity, resolveCountry, resolveRegion] = await Promise.all([
      buildNameResolver(this.prisma, GeoEntityType.CITY, cityIds, locale),
      buildNameResolver(this.prisma, GeoEntityType.COUNTRY, countryIdList, locale),
      buildNameResolver(this.prisma, GeoEntityType.REGION, regionIds, locale),
    ]);

    return applyCityNames(rows, resolveCity, resolveCountry, resolveRegion);
  }

  async getCityDetails(cityId: string, locale: AppLocale = DEFAULT_APP_LOCALE) {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: {
        aliases: { orderBy: { fromYear: 'asc' } },
        country: true,
        region: true,
      },
    });
    if (!city) return null;

    const [resolveCity, resolveCountry, resolveRegion] = await Promise.all([
      buildNameResolver(this.prisma, GeoEntityType.CITY, [city.id], locale),
      city.country
        ? buildNameResolver(this.prisma, GeoEntityType.COUNTRY, [city.country.id], locale)
        : Promise.resolve((_id: string, n: string) => n),
      city.region
        ? buildNameResolver(this.prisma, GeoEntityType.REGION, [city.region.id], locale)
        : Promise.resolve((_id: string, n: string) => n),
    ]);

    const [localized] = applyCityNames([city], resolveCity, resolveCountry, resolveRegion);
    return localized;
  }

  async search(q: string, century?: string, locale: AppLocale = DEFAULT_APP_LOCALE) {
    const query = q?.trim();
    if (!query || query.length < 2) return { countries: [], regions: [], cities: [] };

    const range = century ? centuryToYearRange(century) : null;
    const periodFilter = range ? periodOverlapFilter(range.from, range.to) : {};
    const contains = { contains: query, mode: 'insensitive' as const };

    const [countryNameHits, regionNameHits, cityNameHits] = await Promise.all([
      this.prisma.geographicName.findMany({
        where: { entityType: GeoEntityType.COUNTRY, locale, name: contains },
        select: { entityId: true },
        take: 40,
      }),
      this.prisma.geographicName.findMany({
        where: { entityType: GeoEntityType.REGION, locale, name: contains },
        select: { entityId: true },
        take: 40,
      }),
      this.prisma.geographicName.findMany({
        where: { entityType: GeoEntityType.CITY, locale, name: contains },
        select: { entityId: true },
        take: 60,
      }),
    ]);

    const countryIdsFromI18n = countryNameHits.map((r) => r.entityId);
    const regionIdsFromI18n = regionNameHits.map((r) => r.entityId);
    const cityIdsFromI18n = cityNameHits.map((r) => r.entityId);

    const [countries, regions, cities] = await this.prisma.$transaction(async (tx) => {
      const [countryRows, regionRows, cityRows] = await Promise.all([
        tx.country.findMany({
          where: {
            ...periodFilter,
            OR: [
              { name: contains },
              { historicalName: contains },
              { iso2: contains },
              { iso3: contains },
              ...(countryIdsFromI18n.length ? [{ id: { in: countryIdsFromI18n } }] : []),
            ],
          },
          orderBy: { name: 'asc' },
          take: 20,
        }),
        tx.region.findMany({
          where: {
            ...periodFilter,
            OR: [{ name: contains }, ...(regionIdsFromI18n.length ? [{ id: { in: regionIdsFromI18n } }] : [])],
          },
          include: { country: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
          take: 20,
        }),
        tx.city.findMany({
          where: {
            ...periodFilter,
            OR: [
              { name: contains },
              { historicalName: contains },
              { aliases: { some: { oldName: contains } } },
              ...(cityIdsFromI18n.length ? [{ id: { in: cityIdsFromI18n } }] : []),
            ],
          },
          include: {
            aliases: { take: 5, orderBy: { fromYear: 'asc' } },
            country: { select: { id: true, name: true } },
            region: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
          take: 30,
        }),
      ]);

      return [countryRows, regionRows, cityRows];
    });

    const [resolveCountry, resolveRegion, resolveCity] = await Promise.all([
      buildNameResolver(
        this.prisma,
        GeoEntityType.COUNTRY,
        [...countries.map((c) => c.id), ...regions.map((r) => r.country?.id).filter(Boolean) as string[]],
        locale,
      ),
      buildNameResolver(
        this.prisma,
        GeoEntityType.REGION,
        regions.map((r) => r.id),
        locale,
      ),
      buildNameResolver(
        this.prisma,
        GeoEntityType.CITY,
        cities.map((c) => c.id),
        locale,
      ),
    ]);

    return {
      countries: applyCountryNames(countries, resolveCountry),
      regions: applyRegionNames(
        regions.map((r) => ({
          ...r,
          country: r.country
            ? { ...r.country, name: resolveCountry(r.country.id, r.country.name) }
            : r.country,
        })),
        resolveRegion,
      ),
      cities: applyCityNames(cities, resolveCity, resolveCountry, resolveRegion),
    };
  }
}
