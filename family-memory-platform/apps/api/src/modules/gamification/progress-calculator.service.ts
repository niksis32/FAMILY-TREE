import { Injectable } from '@nestjs/common';
import { DISCOVERY_SCORE_WEIGHTS } from '@family/shared';
import type {
  DiscoveryScoreBreakdown,
  FamilyDiscoveryScore,
  MissingDataGap,
  ResearchProgressCategory,
  ResearchProgressSnapshot,
  TreeResearchProgress,
} from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface TreeMetrics {
  personCount: number;
  personsWithBirthDate: number;
  personsWithDeathDate: number;
  personsWithAvatar: number;
  personsWithBiography: number;
  personsWithBirthPlace: number;
  completeProfiles: number;
  relationshipCount: number;
  sourcedRelationships: number;
  eventCount: number;
  eventsWithPlace: number;
  migrationEvents: number;
  migrationRoutes: number;
  documentCount: number;
  archiveDocuments: number;
  ocrDocuments: number;
  ancestorDocuments: number;
  citationCount: number;
  mediaCount: number;
  identifiedPhotos: number;
  maxLineDepth: number;
  maternalLineDepth: number;
  placesWithCoords: number;
}

@Injectable()
export class ProgressCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async collectMetrics(): Promise<TreeMetrics> {
    const [
      personCount,
      personsWithBirthDate,
      personsWithDeathDate,
      personsWithAvatar,
      personsWithBiography,
      personsWithBirthPlace,
      relationshipCount,
      sourcedRelationships,
      eventCount,
      eventsWithPlace,
      migrationEvents,
      documentCount,
      archiveDocuments,
      ocrDocuments,
      ancestorDocuments,
      citationCount,
      mediaCount,
      identifiedPhotos,
      placesWithCoords,
      persons,
      relationships,
    ] = await Promise.all([
      this.prisma.person.count({ where: { deletedAt: null } }),
      this.prisma.person.count({ where: { deletedAt: null, birthDate: { not: null } } }),
      this.prisma.person.count({ where: { deletedAt: null, deathDate: { not: null } } }),
      this.prisma.person.count({ where: { deletedAt: null, avatarMediaId: { not: null } } }),
      this.prisma.person.count({ where: { deletedAt: null, biography: { not: null } } }),
      this.prisma.event.groupBy({
        by: ['personId'],
        where: { deletedAt: null, type: 'BIRTH', placeId: { not: null }, personId: { not: null } },
      }).then((rows) => rows.length),
      this.prisma.relationship.count({ where: { deletedAt: null } }),
      this.prisma.relationship.count({ where: { deletedAt: null, sourceId: { not: null } } }),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.event.count({ where: { deletedAt: null, placeId: { not: null } } }),
      this.prisma.event.count({
        where: { deletedAt: null, type: { in: ['MIGRATION', 'IMMIGRATION', 'RESIDENCE'] } },
      }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null, documentType: 'ARCHIVE_RECORD' } }),
      this.prisma.document.count({ where: { deletedAt: null, ocrText: { not: null } } }),
      this.countAncestorDocuments(),
      this.prisma.citation.count({ where: { deletedAt: null } }),
      this.prisma.media.count({ where: { deletedAt: null } }),
      this.countIdentifiedPhotos(),
      this.prisma.place.count({
        where: { deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      }),
      this.prisma.person.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          givenName: true,
          familyName: true,
          gender: true,
          birthDate: true,
          deathDate: true,
          avatarMediaId: true,
          biography: true,
        },
      }),
      this.prisma.relationship.findMany({
        where: { deletedAt: null },
        select: { fromPersonId: true, toPersonId: true, type: true },
      }),
    ]);

    const birthPlaceSet = new Set(
      (
        await this.prisma.event.findMany({
          where: { deletedAt: null, type: 'BIRTH', placeId: { not: null }, personId: { not: null } },
          select: { personId: true },
        })
      ).map((e) => e.personId!),
    );

    let completeProfiles = 0;
    for (const p of persons) {
      if (
        p.birthDate &&
        p.avatarMediaId &&
        p.biography?.trim() &&
        birthPlaceSet.has(p.id)
      ) {
        completeProfiles += 1;
      }
    }

    const { maxLineDepth, maternalLineDepth } = this.computeLineDepths(persons, relationships);
    const migrationRoutes = migrationEvents >= 2 && placesWithCoords >= 2 ? 1 : 0;

    return {
      personCount,
      personsWithBirthDate,
      personsWithDeathDate,
      personsWithAvatar,
      personsWithBiography,
      personsWithBirthPlace,
      completeProfiles,
      relationshipCount,
      sourcedRelationships,
      eventCount,
      eventsWithPlace,
      migrationEvents,
      migrationRoutes,
      documentCount,
      archiveDocuments,
      ocrDocuments,
      ancestorDocuments,
      citationCount,
      mediaCount,
      identifiedPhotos,
      maxLineDepth,
      maternalLineDepth,
      placesWithCoords,
    };
  }

  async buildResearchProgress(metrics: TreeMetrics): Promise<ResearchProgressSnapshot> {
    const categories: ResearchProgressCategory[] = [
      this.category('persons', 'gamification.progress.persons', metrics.personCount, Math.max(metrics.personCount, 1), [
        metrics.personsWithBirthDate,
        metrics.personsWithAvatar,
        metrics.personsWithBiography,
      ]),
      this.category('relationships', 'gamification.progress.relationships', metrics.sourcedRelationships, Math.max(metrics.relationshipCount, 1)),
      this.category('events', 'gamification.progress.events', metrics.eventsWithPlace, Math.max(metrics.eventCount, 1)),
      this.category('documents', 'gamification.progress.documents', metrics.documentCount, Math.max(metrics.personCount, 1)),
      this.category('citations', 'gamification.progress.citations', metrics.citationCount, Math.max(metrics.personCount, 1)),
      this.category('media', 'gamification.progress.media', metrics.identifiedPhotos, Math.max(metrics.mediaCount, 1)),
      this.category('geo', 'gamification.progress.geo', metrics.placesWithCoords, Math.max(metrics.eventCount, 1)),
    ];

    const overallPercent = Math.round(
      categories.reduce((sum, c) => sum + c.percent, 0) / Math.max(categories.length, 1),
    );

    return { overallPercent, categories, computedAt: new Date().toISOString() };
  }

  buildDiscoveryScore(metrics: TreeMetrics): FamilyDiscoveryScore {
    const breakdown: DiscoveryScoreBreakdown = {
      persons: this.percent(
        metrics.personsWithBirthDate +
          metrics.personsWithAvatar +
          metrics.personsWithBiography +
          metrics.personsWithBirthPlace,
        Math.max(metrics.personCount * 4, 1),
      ),
      relationships: this.percent(metrics.sourcedRelationships, Math.max(metrics.relationshipCount, 1)),
      events: this.percent(metrics.eventsWithPlace, Math.max(metrics.eventCount, 1)),
      documents: this.percent(metrics.documentCount, Math.max(metrics.personCount, 1)),
      citations: this.percent(metrics.citationCount, Math.max(metrics.personCount, 1)),
      media: this.percent(metrics.identifiedPhotos, Math.max(metrics.mediaCount, 1)),
      geo: this.percent(metrics.migrationRoutes > 0 ? metrics.placesWithCoords : 0, Math.max(metrics.placesWithCoords, 1)),
    };

    const total = Math.round(
      (breakdown.persons * DISCOVERY_SCORE_WEIGHTS.persons +
        breakdown.relationships * DISCOVERY_SCORE_WEIGHTS.relationships +
        breakdown.events * DISCOVERY_SCORE_WEIGHTS.events +
        breakdown.documents * DISCOVERY_SCORE_WEIGHTS.documents +
        breakdown.citations * DISCOVERY_SCORE_WEIGHTS.citations +
        breakdown.media * DISCOVERY_SCORE_WEIGHTS.media +
        breakdown.geo * DISCOVERY_SCORE_WEIGHTS.geo) /
        100,
    );

    return { total, breakdown, computedAt: new Date().toISOString() };
  }

  buildTreeProgress(metrics: TreeMetrics): TreeResearchProgress {
    const documentedFields =
      metrics.personsWithBirthDate +
      metrics.personsWithDeathDate +
      metrics.personsWithAvatar +
      metrics.personsWithBiography +
      metrics.personsWithBirthPlace;
    const maxFields = Math.max(metrics.personCount * 5, 1);

    return {
      personCount: metrics.personCount,
      documentedPercent: Math.round((documentedFields / maxFields) * 100),
      sourcedFacts: metrics.citationCount + metrics.sourcedRelationships,
      identifiedPhotos: metrics.identifiedPhotos,
      migrationPoints: metrics.migrationEvents,
    };
  }

  async collectMissingDataGaps(limit = 12): Promise<MissingDataGap[]> {
    const persons = await this.prisma.person.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthDate: true,
        deathDate: true,
        avatarMediaId: true,
        biography: true,
        events: { where: { deletedAt: null, type: 'BIRTH' }, select: { placeId: true } },
      },
      take: 200,
    });

    const gaps: MissingDataGap[] = [];

    for (const person of persons) {
      const label = [person.givenName, person.familyName].filter(Boolean).join(' ');
      if (!person.birthDate) {
        gaps.push({
          code: 'person.birthDate.missing',
          entityId: person.id,
          entityType: 'person',
          entityLabel: label,
          severity: 'critical',
          hintKey: 'gamification.missingData.gaps.birthDate',
        });
      }
      if (!person.events.some((e) => e.placeId)) {
        gaps.push({
          code: 'person.birthPlace.missing',
          entityId: person.id,
          entityType: 'person',
          entityLabel: label,
          severity: 'high',
          hintKey: 'gamification.missingData.gaps.birthPlace',
        });
      }
      if (!person.avatarMediaId) {
        gaps.push({
          code: 'person.avatar.missing',
          entityId: person.id,
          entityType: 'person',
          entityLabel: label,
          severity: 'medium',
          hintKey: 'gamification.missingData.gaps.avatar',
        });
      }
      if (!person.biography?.trim()) {
        gaps.push({
          code: 'person.biography.missing',
          entityId: person.id,
          entityType: 'person',
          entityLabel: label,
          severity: 'low',
          hintKey: 'gamification.missingData.gaps.biography',
        });
      }
    }

    const severityOrder: Record<MissingDataGap['severity'], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, limit);
  }

  private category(
    key: string,
    labelKey: string,
    current: number,
    target: number,
    parts?: number[],
  ): ResearchProgressCategory {
    const value = parts ? parts.filter(Boolean).length : current;
    const max = parts ? parts.length * Math.max(Math.ceil(target / Math.max(parts.length, 1)), 1) : target;
    const percent = this.percent(value, max);
    return { key, labelKey, percent, current: value, target: max };
  }

  private percent(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  private async countIdentifiedPhotos(): Promise<number> {
    const tagged = await this.prisma.photoFaceTag.groupBy({
      by: ['mediaId'],
      where: { personId: { not: null } },
    });
    return tagged.length;
  }

  private async countAncestorDocuments(): Promise<number> {
    const docs = await this.prisma.document.findMany({
      where: { deletedAt: null, personId: { not: null } },
      select: { personId: true },
    });
    if (docs.length === 0) return 0;

    const relationships = await this.prisma.relationship.findMany({
      where: { deletedAt: null, type: { in: ['PARENT', 'ADOPTIVE_PARENT'] } },
      select: { fromPersonId: true, toPersonId: true },
    });

    const childToParents = new Map<string, string[]>();
    for (const rel of relationships) {
      const list = childToParents.get(rel.toPersonId) ?? [];
      list.push(rel.fromPersonId);
      childToParents.set(rel.toPersonId, list);
    }

    const depthCache = new Map<string, number>();
    const depthOf = (personId: string): number => {
      if (depthCache.has(personId)) return depthCache.get(personId)!;
      const parents = childToParents.get(personId) ?? [];
      if (parents.length === 0) {
        depthCache.set(personId, 0);
        return 0;
      }
      const depth = 1 + Math.max(...parents.map(depthOf));
      depthCache.set(personId, depth);
      return depth;
    };

    return docs.filter((d) => depthOf(d.personId!) >= 2).length;
  }

  private computeLineDepths(
    persons: { id: string; gender: string | null }[],
    relationships: { fromPersonId: string; toPersonId: string; type: string }[],
  ) {
    const childToParents = new Map<string, string[]>();
    const personGender = new Map(persons.map((p) => [p.id, p.gender]));

    for (const rel of relationships) {
      if (rel.type !== 'PARENT' && rel.type !== 'ADOPTIVE_PARENT') continue;
      const list = childToParents.get(rel.toPersonId) ?? [];
      list.push(rel.fromPersonId);
      childToParents.set(rel.toPersonId, list);
    }

    const depthCache = new Map<string, number>();
    const depthOf = (personId: string, maternalOnly: boolean): number => {
      const cacheKey = `${personId}:${maternalOnly ? 'm' : 'a'}`;
      if (depthCache.has(cacheKey)) return depthCache.get(cacheKey)!;

      const parents = childToParents.get(personId) ?? [];
      const filtered = maternalOnly
        ? parents.filter((id) => personGender.get(id) === 'FEMALE')
        : parents;

      if (filtered.length === 0) {
        depthCache.set(cacheKey, 0);
        return 0;
      }

      const depth = 1 + Math.max(...filtered.map((id) => depthOf(id, maternalOnly)));
      depthCache.set(cacheKey, depth);
      return depth;
    };

    let maxLineDepth = 0;
    let maternalLineDepth = 0;
    for (const person of persons) {
      maxLineDepth = Math.max(maxLineDepth, depthOf(person.id, false));
      maternalLineDepth = Math.max(maternalLineDepth, depthOf(person.id, true));
    }

    return { maxLineDepth, maternalLineDepth };
  }
}
