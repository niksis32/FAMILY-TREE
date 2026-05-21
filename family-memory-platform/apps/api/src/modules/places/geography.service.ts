import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { centuryToYearRange, periodOverlapFilter } from './geography.utils';

@Injectable()
export class GeographyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Все записи Country с тем же iso2 (империя, РФ, geonames — одна зона RU). */
  private async countryIdsForScope(countryId: string) {
    const country = await this.prisma.country.findUnique({
      where: { id: countryId.trim() },
      select: { id: true, iso2: true },
    });
    if (!country) return [countryId.trim()];

    if (!country.iso2) return [country.id];

    const related = await this.prisma.country.findMany({
      where: { iso2: country.iso2 },
      select: { id: true },
    });
    return related.map((item) => item.id);
  }

  listCountries(century?: string) {
    const range = century ? centuryToYearRange(century) : null;
    const where: Prisma.CountryWhereInput = range ? periodOverlapFilter(range.from, range.to) : {};

    return this.prisma.country.findMany({
      where,
      orderBy: [{ name: 'asc' }, { periodFrom: 'asc' }],
      take: 500,
    });
  }

  async listRegions(countryId: string, century?: string) {
    if (!countryId?.trim()) throw new BadRequestException('countryId is required');

    const range = century ? centuryToYearRange(century) : null;
    const countryIds = await this.countryIdsForScope(countryId);
    const where: Prisma.RegionWhereInput = {
      countryId: { in: countryIds },
      ...(range ? periodOverlapFilter(range.from, range.to) : {}),
    };

    return this.prisma.region.findMany({
      where,
      orderBy: [{ name: 'asc' }, { periodFrom: 'asc' }],
      take: 2000,
    });
  }

  async listCities(countryId: string, regionId?: string, century?: string) {
    if (!countryId?.trim()) throw new BadRequestException('countryId is required');

    const range = century ? centuryToYearRange(century) : null;
    const countryIds = await this.countryIdsForScope(countryId);
    const where: Prisma.CityWhereInput = {
      countryId: { in: countryIds },
      ...(regionId?.trim() ? { regionId: regionId.trim() } : {}),
      ...(range ? periodOverlapFilter(range.from, range.to) : {}),
    };

    return this.prisma.city.findMany({
      where,
      include: {
        aliases: { orderBy: { fromYear: 'asc' } },
        country: { select: { id: true, name: true, historicalName: true, iso2: true } },
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ population: 'desc' }, { name: 'asc' }],
      take: 5000,
    });
  }

  async getCityDetails(cityId: string) {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: {
        aliases: { orderBy: { fromYear: 'asc' } },
        country: true,
        region: true,
      },
    });
    if (!city) return null;
    return city;
  }

  search(q: string, century?: string) {
    const query = q?.trim();
    if (!query || query.length < 2) return { countries: [], regions: [], cities: [] };

    const range = century ? centuryToYearRange(century) : null;
    const periodFilter = range ? periodOverlapFilter(range.from, range.to) : {};
    const contains = { contains: query, mode: 'insensitive' as const };

    return this.prisma.$transaction(async (tx) => {
      const [countries, regions, cities] = await Promise.all([
        tx.country.findMany({
          where: {
            ...periodFilter,
            OR: [{ name: contains }, { historicalName: contains }, { iso2: contains }, { iso3: contains }],
          },
          orderBy: { name: 'asc' },
          take: 20,
        }),
        tx.region.findMany({
          where: {
            ...periodFilter,
            name: contains,
          },
          include: { country: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
          take: 20,
        }),
        tx.city.findMany({
          where: {
            ...periodFilter,
            OR: [{ name: contains }, { historicalName: contains }, { aliases: { some: { oldName: contains } } }],
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

      return { countries, regions, cities };
    });
  }
}
