import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import type { AddFamilyMemberDto, UpdateFamilyMemberDto } from './families-member.dto';
import type { CreateFamilyDto, UpdateFamilyDto } from './families.dto';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.family.findMany({
      where: { deletedAt: null },
      include: { members: { where: { deletedAt: null }, include: { person: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const family = await this.prisma.family.findFirst({
      where: { id, deletedAt: null },
      include: { members: { where: { deletedAt: null }, include: { person: true } }, events: true },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  create(dto: CreateFamilyDto) {
    return this.prisma.family.create({
      data: workspaceScopedCreateData<Prisma.FamilyUncheckedCreateInput>({
        name: dto.name,
        notes: dto.notes,
      }),
    });
  }

  async update(id: string, dto: UpdateFamilyDto) {
    await this.ensureExists(id);
    return this.prisma.family.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.family.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addMember(familyId: string, dto: AddFamilyMemberDto) {
    await this.ensureExists(familyId);
    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, deletedAt: null },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const existing = await this.prisma.familyMember.findFirst({
      where: { familyId, personId: dto.personId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('Person is already a member of this family');
    }

    await this.prisma.familyMember.create({
      data: workspaceScopedCreateData<Prisma.FamilyMemberUncheckedCreateInput>({
        familyId,
        personId: dto.personId,
        role: dto.role,
      }),
    });

    return this.findOne(familyId);
  }

  async updateMember(familyId: string, memberId: string, dto: UpdateFamilyMemberDto) {
    await this.ensureMemberExists(familyId, memberId);
    await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
    return this.findOne(familyId);
  }

  async removeMember(familyId: string, memberId: string) {
    await this.ensureMemberExists(familyId, memberId);
    await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
    return this.findOne(familyId);
  }

  private async ensureMemberExists(familyId: string, memberId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException('Family member not found');
    }
  }

  private async ensureExists(id: string) {
    const family = await this.prisma.family.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!family) throw new NotFoundException('Family not found');
  }
}
