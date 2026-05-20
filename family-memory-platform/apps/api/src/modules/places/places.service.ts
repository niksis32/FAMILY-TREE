import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import type { CreatePlaceDto, UpdatePlaceDto } from './places.dto';

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  findAll() {
    return this.prisma.place.findMany({
      where: { deletedAt: null },
      orderBy: [{ country: 'asc' }, { region: 'asc' }, { city: 'asc' }, { name: 'asc' }],
      take: 500,
    });
  }

  async findOne(id: string) {
    const place = await this.prisma.place.findFirst({ where: { id, deletedAt: null }, include: { events: true } });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  async create(dto: CreatePlaceDto) {
    const place = await this.prisma.place.create({ data: dto });
    await this.indexPlace(place.id);
    return place;
  }

  async update(id: string, dto: UpdatePlaceDto) {
    await this.ensureExists(id);
    const place = await this.prisma.place.update({ where: { id }, data: dto });
    await this.indexPlace(place.id);
    return place;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.place.update({ where: { id }, data: { deletedAt: new Date() } });
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
