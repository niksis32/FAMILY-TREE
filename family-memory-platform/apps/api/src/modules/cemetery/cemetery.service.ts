import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { inferIsLiving } from '@family/genealogy-core';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { BurialIndexService, type BurialIndexDocument } from './burial-index.service';
import { BurialPhotogrammetryQueueService } from './burial-photogrammetry.queue';
import type {
  AnalyzeTombstonePhotoDto,
  CreateBurialSiteDto,
  CreateCemeteryDto,
  CreateMemorialDto,
  PlanCemeteryRouteDto,
  UpdateBurialSiteDto,
  UpdateCemeteryDto,
  UpdateMemorialDto,
} from './cemetery.dto';

@Injectable()
export class CemeteryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly burialIndex: BurialIndexService,
    private readonly photogrammetryQueue: BurialPhotogrammetryQueueService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  async listCemeteries(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const rows = await this.prisma.cemetery.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { burialSites: true } } },
    });
    return rows.map((c) => this.mapCemetery(c));
  }

  async createCemetery(userId: string, dto: CreateCemeteryDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const row = await this.prisma.cemetery.create({
      data: workspaceScopedCreateData({
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        notes: dto.notes,
      }),
    });
    return this.mapCemetery(row);
  }

  async getCemetery(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const row = await this.prisma.cemetery.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('Cemetery not found');
    return this.mapCemetery(row);
  }

  async updateCemetery(userId: string, id: string, dto: UpdateCemeteryDto) {
    await this.getCemetery(userId, id);
    const row = await this.prisma.cemetery.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        notes: dto.notes,
      },
    });
    return this.mapCemetery(row);
  }

  async deleteCemetery(userId: string, id: string) {
    await this.getCemetery(userId, id);
    await this.prisma.cemetery.delete({ where: { id } });
    return { deleted: true };
  }

  async listBurialSites(userId: string, cemeteryId?: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const rows = await this.prisma.burialSite.findMany({
      where: { workspaceId, ...(cemeteryId ? { cemeteryId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        person: { select: { id: true, givenName: true, familyName: true, deathDate: true } },
        cemetery: { select: { id: true, name: true } },
      },
    });
    return rows.map((b) => this.mapBurialSite(b));
  }

  async createBurialSite(userId: string, dto: CreateBurialSiteDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    await this.ensureCemetery(dto.cemeteryId);
    if (dto.personId) {
      await this.assertDeceasedPerson(dto.personId);
    }

    const row = await this.prisma.burialSite.create({
      data: workspaceScopedCreateData({
        cemeteryId: dto.cemeteryId,
        personId: dto.personId,
        plotLabel: dto.plotLabel,
        latitude: dto.latitude,
        longitude: dto.longitude,
        burialDate: dto.burialDate ? new Date(dto.burialDate) : undefined,
        notes: dto.notes,
      }),
      include: {
        person: { select: { id: true, givenName: true, familyName: true, deathDate: true } },
        cemetery: { select: { id: true, name: true } },
      },
    });
    void this.syncBurialIndex(row);
    return this.mapBurialSite(row);
  }

  async getBurialSite(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const row = await this.prisma.burialSite.findFirst({
      where: { id, workspaceId },
      include: {
        person: { select: { id: true, givenName: true, familyName: true, deathDate: true } },
        cemetery: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Burial site not found');
    return this.mapBurialSite(row);
  }

  async updateBurialSite(userId: string, id: string, dto: UpdateBurialSiteDto) {
    await this.getBurialSite(userId, id);
    if (dto.personId) {
      await this.assertDeceasedPerson(dto.personId);
    }

    const row = await this.prisma.burialSite.update({
      where: { id },
      data: {
        personId: dto.personId,
        plotLabel: dto.plotLabel,
        latitude: dto.latitude,
        longitude: dto.longitude,
        burialDate: dto.burialDate ? new Date(dto.burialDate) : undefined,
        notes: dto.notes,
      },
      include: {
        person: { select: { id: true, givenName: true, familyName: true, deathDate: true } },
        cemetery: { select: { id: true, name: true } },
      },
    });
    void this.syncBurialIndex(row);
    return this.mapBurialSite(row);
  }

  async deleteBurialSite(userId: string, id: string) {
    await this.getBurialSite(userId, id);
    await this.prisma.burialSite.delete({ where: { id } });
    void this.removeBurialIndex(id);
    return { deleted: true };
  }

  async searchBurials(userId: string, q: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const hits = await this.burialIndex.search(workspaceId, q);
    return { q, hits };
  }

  async requestPhotogrammetry(userId: string, burialSiteId: string, sourceMediaId?: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    await this.getBurialSite(userId, burialSiteId);

    const job = await this.prisma.burialPhotogrammetryJob.create({
      data: workspaceScopedCreateData({
        burialSiteId,
        sourceMediaId,
        status: 'QUEUED',
      }),
    });
    await this.photogrammetryQueue.enqueue(job.id, workspaceId, burialSiteId);
    return {
      id: job.id,
      burialSiteId,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
    };
  }

  async getPhotogrammetryJob(userId: string, jobId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const job = await this.prisma.burialPhotogrammetryJob.findFirst({
      where: { id: jobId, workspaceId },
    });
    if (!job) throw new NotFoundException('Photogrammetry job not found');
    return {
      id: job.id,
      burialSiteId: job.burialSiteId,
      status: job.status,
      sceneJson: job.sceneJson,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  async processPhotogrammetryJob(jobId: string) {
    const job = await this.prisma.burialPhotogrammetryJob.findUnique({
      where: { id: jobId },
      include: {
        burialSite: {
          include: {
            person: { select: { givenName: true, familyName: true } },
            cemetery: { select: { name: true } },
            memorials: { orderBy: { createdAt: 'asc' }, take: 3 },
          },
        },
      },
    });
    if (!job) return null;

    await this.prisma.burialPhotogrammetryJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const site = job.burialSite;
      const plotWidth = 2.6;
      const plotDepth = 1.4;
      const monuments = site.memorials.map((m, index) => ({
        id: m.id,
        title: m.title,
        inscription: m.inscription,
        widthM: 0.55 + (index % 2) * 0.1,
        heightM: 1.05 + index * 0.12,
        depthM: 0.16,
        x: -plotWidth / 2 + 0.45 + index * 0.75,
        z: (index % 2) * 0.15,
        material: 'granite',
        source: 'photogrammetry-stub',
      }));

      if (monuments.length === 0) {
        monuments.push({
          id: 'photogrammetry-monument',
          title:
            site.plotLabel ??
            [site.person?.givenName, site.person?.familyName].filter(Boolean).join(' ') ??
            'Memorial',
          inscription: site.notes,
          widthM: 0.72,
          heightM: 1.28,
          depthM: 0.2,
          x: 0,
          z: 0,
          material: 'marble',
          source: 'photogrammetry-stub',
        });
      }

      const sceneJson = {
        version: '1.1',
        source: 'photogrammetry-queue',
        burialSiteId: site.id,
        cemeteryName: site.cemetery.name,
        plotLabel: site.plotLabel,
        ground: { widthM: plotWidth, depthM: plotDepth, texture: 'grass-highres' },
        monuments,
        camera: { position: [2.8, 2.0, 2.6], target: [0, 0.65, 0] },
        metadata: {
          sourceMediaId: job.sourceMediaId,
          processedAt: new Date().toISOString(),
          note: 'Stub photogrammetry pipeline — replace with mesh reconstruction worker.',
        },
      };

      await this.prisma.burialPhotogrammetryJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          sceneJson: sceneJson as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.burialPhotogrammetryJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Photogrammetry failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async listMemorials(userId: string, burialSiteId?: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const rows = await this.prisma.memorial.findMany({
      where: { workspaceId, ...(burialSiteId ? { burialSiteId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((m) => this.mapMemorial(m));
  }

  async createMemorial(userId: string, dto: CreateMemorialDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    await this.getBurialSite(userId, dto.burialSiteId);

    const row = await this.prisma.memorial.create({
      data: workspaceScopedCreateData({
        burialSiteId: dto.burialSiteId,
        title: dto.title,
        inscription: dto.inscription,
        photoMediaId: dto.photoMediaId,
      }),
    });
    return this.mapMemorial(row);
  }

  async getMemorial(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const row = await this.prisma.memorial.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('Memorial not found');
    return this.mapMemorial(row);
  }

  async updateMemorial(userId: string, id: string, dto: UpdateMemorialDto) {
    await this.getMemorial(userId, id);
    const row = await this.prisma.memorial.update({
      where: { id },
      data: {
        title: dto.title,
        inscription: dto.inscription,
        photoMediaId: dto.photoMediaId,
      },
    });
    return this.mapMemorial(row);
  }

  async deleteMemorial(userId: string, id: string) {
    await this.getMemorial(userId, id);
    await this.prisma.memorial.delete({ where: { id } });
    return { deleted: true };
  }

  async getMapMarkers(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const sites = await this.prisma.burialSite.findMany({
      where: {
        workspaceId,
        OR: [{ latitude: { not: null } }, { longitude: { not: null } }],
      },
      include: {
        person: { select: { id: true, givenName: true, familyName: true } },
        cemetery: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });

    return {
      markers: sites
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          cemeteryId: s.cemeteryId,
          cemeteryName: s.cemetery.name,
          plotLabel: s.plotLabel,
          latitude: s.latitude,
          longitude: s.longitude,
          person: s.person
            ? {
                id: s.person.id,
                displayName: [s.person.givenName, s.person.familyName].filter(Boolean).join(' '),
              }
            : null,
        })),
    };
  }

  async planRoute(userId: string, dto: PlanCemeteryRouteDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);

    const sites = await this.prisma.burialSite.findMany({
      where: { workspaceId, id: { in: dto.burialSiteIds } },
      include: {
        person: { select: { givenName: true, familyName: true } },
        cemetery: { select: { name: true, latitude: true, longitude: true } },
      },
    });

    if (sites.length === 0) {
      throw new BadRequestException('No burial sites found for route planning');
    }

    const siteById = new Map(sites.map((s) => [s.id, s]));
    const stops = dto.burialSiteIds
      .map((id, index) => {
        const s = siteById.get(id);
        if (!s) return null;
        const lat = s.latitude ?? s.cemetery.latitude;
        const lng = s.longitude ?? s.cemetery.longitude;
        if (lat == null || lng == null) return null;
        const label =
          s.plotLabel ??
          [s.person?.givenName, s.person?.familyName].filter(Boolean).join(' ') ??
          s.cemetery.name;
        return {
          order: index + 1,
          burialSiteId: s.id,
          label,
          latitude: lat,
          longitude: lng,
          osmLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
          googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        };
      })
      .filter((stop): stop is NonNullable<typeof stop> => stop != null);

    const coordPath = stops.map((s) => `${s.longitude},${s.latitude}`).join(';');
    const osmDirections = coordPath
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${coordPath}`
      : null;
    const googleWaypoints = stops.map((s) => `${s.latitude},${s.longitude}`).join('|');
    const googleDirections = googleWaypoints
      ? `https://www.google.com/maps/dir/?api=1&travelmode=driving&waypoints=${encodeURIComponent(googleWaypoints)}`
      : null;

    return {
      stopCount: stops.length,
      stops,
      osmDirectionsUrl: osmDirections,
      googleDirectionsUrl: googleDirections,
    };
  }

  async getBurialSiteReconstruction(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);

    const completedJob = await this.prisma.burialPhotogrammetryJob.findFirst({
      where: { burialSiteId: id, workspaceId, status: 'COMPLETED', sceneJson: { not: null } },
      orderBy: { completedAt: 'desc' },
    });
    if (completedJob?.sceneJson && typeof completedJob.sceneJson === 'object') {
      return completedJob.sceneJson;
    }

    const site = await this.getBurialSite(userId, id);
    const memorials = await this.prisma.memorial.findMany({
      where: { burialSiteId: id },
      orderBy: { createdAt: 'asc' },
    });

    const plotWidth = 2.4;
    const plotDepth = 1.2;
    const monuments = memorials.map((m, index) => ({
      id: m.id,
      title: m.title,
      inscription: m.inscription,
      widthM: 0.6,
      heightM: 1.1 + (index % 3) * 0.15,
      depthM: 0.18,
      x: -plotWidth / 2 + 0.5 + index * 0.7,
      z: 0,
    }));

    if (monuments.length === 0) {
      monuments.push({
        id: 'default-monument',
        title: site.plotLabel ?? site.person?.displayName ?? 'Memorial',
        inscription: site.notes,
        widthM: 0.7,
        heightM: 1.25,
        depthM: 0.2,
        x: 0,
        z: 0,
      });
    }

    return {
      version: '1.1',
      burialSiteId: site.id,
      cemeteryName: site.cemeteryName,
      plotLabel: site.plotLabel,
      person: site.person,
      latitude: site.latitude,
      longitude: site.longitude,
      ground: { widthM: plotWidth, depthM: plotDepth, texture: 'grass' },
      monuments,
      camera: { position: [2.5, 1.8, 2.5], target: [0, 0.6, 0] },
    };
  }

  private async syncBurialIndex(row: {
    id: string;
    workspaceId: string;
    cemeteryId: string;
    personId: string | null;
    plotLabel: string | null;
    latitude: number | null;
    longitude: number | null;
    burialDate: Date | null;
    notes: string | null;
    cemetery: { name: string };
    person: { givenName: string; familyName: string | null } | null;
  }) {
    try {
      const personDisplayName = row.person
        ? [row.person.givenName, row.person.familyName].filter(Boolean).join(' ')
        : null;
      const doc: BurialIndexDocument = {
        id: row.id,
        burialSiteId: row.id,
        workspaceId: row.workspaceId,
        cemeteryId: row.cemeteryId,
        cemeteryName: row.cemetery.name,
        plotLabel: row.plotLabel,
        personDisplayName,
        personId: row.personId,
        latitude: row.latitude,
        longitude: row.longitude,
        burialYear: row.burialDate?.getUTCFullYear() ?? null,
        text: [row.plotLabel, personDisplayName, row.cemetery.name, row.notes].filter(Boolean).join(' '),
      };
      await this.burialIndex.upsert(doc);
    } catch {
      // Indexing must not block burial CRUD.
    }
  }

  private async removeBurialIndex(burialSiteId: string) {
    try {
      await this.burialIndex.remove(burialSiteId);
    } catch {
      // ignore
    }
  }

  async analyzePhoto(_userId: string, dto: AnalyzeTombstonePhotoDto) {
    return {
      status: 'mock',
      mediaId: dto.mediaId ?? null,
      imageUrl: dto.imageUrl ?? null,
      ocr: {
        detectedText: 'Иванов Иван Иванович\n1890 — 1962\nСветлая память',
        confidence: 0.72,
        language: 'ru',
        fields: {
          familyName: 'Иванов',
          givenName: 'Иван',
          patronymic: 'Иванович',
          birthYear: 1890,
          deathYear: 1962,
        },
      },
      note: 'Stub OCR result for MVP — connect document-intelligence pipeline in a later iteration.',
    };
  }

  private async ensureCemetery(cemeteryId: string) {
    const cemetery = await this.prisma.cemetery.findFirst({ where: { id: cemeteryId } });
    if (!cemetery) throw new NotFoundException('Cemetery not found');
    return cemetery;
  }

  private async assertDeceasedPerson(personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true, birthDate: true, deathDate: true, isLiving: true },
    });
    if (!person) throw new NotFoundException('Person not found');
    const living = inferIsLiving({
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      isLiving: person.isLiving,
    });
    if (living) {
      throw new BadRequestException('Burial sites cannot be created for living persons');
    }
  }

  private mapCemetery(row: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { burialSites: number };
  }) {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      notes: row.notes,
      burialSiteCount: row._count?.burialSites ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapBurialSite(row: {
    id: string;
    cemeteryId: string;
    personId: string | null;
    plotLabel: string | null;
    latitude: number | null;
    longitude: number | null;
    burialDate: Date | null;
    notes: string | null;
    cemetery: { id: string; name: string };
    person: { id: string; givenName: string; familyName: string | null; deathDate: Date | null } | null;
  }) {
    return {
      id: row.id,
      cemeteryId: row.cemeteryId,
      cemeteryName: row.cemetery.name,
      personId: row.personId,
      person: row.person
        ? {
            id: row.person.id,
            displayName: [row.person.givenName, row.person.familyName].filter(Boolean).join(' '),
            deathDate: row.person.deathDate?.toISOString() ?? null,
          }
        : null,
      plotLabel: row.plotLabel,
      latitude: row.latitude,
      longitude: row.longitude,
      burialDate: row.burialDate?.toISOString() ?? null,
      notes: row.notes,
    };
  }

  private mapMemorial(row: {
    id: string;
    burialSiteId: string;
    title: string;
    inscription: string | null;
    photoMediaId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      burialSiteId: row.burialSiteId,
      title: row.title,
      inscription: row.inscription,
      photoMediaId: row.photoMediaId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
