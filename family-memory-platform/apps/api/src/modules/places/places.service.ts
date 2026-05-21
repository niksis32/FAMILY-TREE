import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { GeographyService } from './geography.service';
import type { CreatePlaceDto, UpdatePlaceDto } from './places.dto';

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly geography: GeographyService,
  ) {}

  findAll() {
    return this.prisma.place.findMany({
      where: { deletedAt: null },
      include: {
        geoCountry: { select: { id: true, name: true, historicalName: true } },
        geoRegion: { select: { id: true, name: true } },
        geoCity: { select: { id: true, name: true, historicalName: true } },
      },
      orderBy: [{ country: 'asc' }, { region: 'asc' }, { city: 'asc' }, { name: 'asc' }],
      take: 500,
    });
  }

  async findOne(id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, deletedAt: null },
      include: {
        events: true,
        geoCountry: true,
        geoRegion: true,
        geoCity: { include: { aliases: true } },
      },
    });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  async create(dto: CreatePlaceDto) {
    const data = await this.resolvePlaceCreateData(dto);
    const place = await this.prisma.place.create({ data });
    await this.indexPlace(place.id);
    return place;
  }

  async update(id: string, dto: UpdatePlaceDto) {
    await this.ensureExists(id);
    const data = await this.resolvePlaceUpdateData(dto);
    const place = await this.prisma.place.update({ where: { id }, data });
    await this.indexPlace(place.id);
    return place;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.place.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async resolvePlaceCreateData(dto: CreatePlaceDto): Promise<Prisma.PlaceUncheckedCreateInput> {
    if (dto.geoCityId) {
      return this.buildDataFromCity(dto);
    }

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name or geoCityId is required');
    }

    return {
      name,
      latitude: dto.latitude,
      longitude: dto.longitude,
      country: dto.country,
      region: dto.region,
      city: dto.city,
      geoCountryId: dto.geoCountryId,
      geoRegionId: dto.geoRegionId,
      geoCityId: dto.geoCityId,
    };
  }

  private async resolvePlaceUpdateData(dto: UpdatePlaceDto): Promise<Prisma.PlaceUncheckedUpdateInput> {
    if (dto.geoCityId) {
      return this.buildDataFromCity(dto);
    }

    const data: Prisma.PlaceUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.geoCountryId !== undefined) data.geoCountryId = dto.geoCountryId;
    if (dto.geoRegionId !== undefined) data.geoRegionId = dto.geoRegionId;
    if (dto.geoCityId !== undefined) data.geoCityId = dto.geoCityId;

    return data;
  }

  private async buildDataFromCity(
    dto: CreatePlaceDto | UpdatePlaceDto,
  ): Promise<Prisma.PlaceUncheckedCreateInput> {
    const city = await this.geography.getCityDetails(dto.geoCityId!);
    if (!city) throw new BadRequestException('City not found');

    const displayCountry = city.country.historicalName
      ? `${city.country.name} (${city.country.historicalName})`
      : city.country.name;

    const defaultName = city.historicalName && city.historicalName !== city.name
      ? `${city.name} (${city.historicalName})`
      : city.name;

    return {
      name: dto.name?.trim() || defaultName,
      latitude: dto.latitude ?? city.latitude ?? undefined,
      longitude: dto.longitude ?? city.longitude ?? undefined,
      country: dto.country ?? displayCountry,
      region: dto.region ?? city.region?.name ?? undefined,
      city: dto.city ?? city.name,
      geoCountryId: dto.geoCountryId ?? city.countryId,
      geoRegionId: dto.geoRegionId ?? city.regionId ?? undefined,
      geoCityId: city.id,
    };
  }

  private async ensureExists(id: string) {
    const place = await this.prisma.place.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!place) throw new NotFoundException('Place not found');
  }

  private async indexPlace(placeId: string) {
    try {
      await this.search.indexPlace(placeId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }
}
