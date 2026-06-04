import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import type { CreateEventDto, UpdateEventDto } from './events.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.event.findMany({
      where: { deletedAt: null },
      include: { person: true, family: true, place: true },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: { person: true, family: true, place: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({ data: this.toEventCreateData(dto) });
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.ensureExists(id);
    return this.prisma.event.update({ where: { id }, data: this.toEventData(dto) });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!event) throw new NotFoundException('Event not found');
  }

  private toEventCreateData(dto: CreateEventDto) {
    return workspaceScopedCreateData<Prisma.EventUncheckedCreateInput>({
      type: dto.type,
      date: dto.date ? new Date(dto.date) : undefined,
      dateEnd: dto.dateEnd ? new Date(dto.dateEnd) : undefined,
      description: dto.description,
      personId: dto.personId,
      familyId: dto.familyId,
      placeId: dto.placeId,
    });
  }

  private toEventData(dto: UpdateEventDto): Prisma.EventUncheckedUpdateInput {
    return {
      type: dto.type,
      date: dto.date ? new Date(dto.date) : undefined,
      dateEnd: dto.dateEnd ? new Date(dto.dateEnd) : undefined,
      description: dto.description,
      personId: dto.personId,
      familyId: dto.familyId,
      placeId: dto.placeId,
    };
  }
}
