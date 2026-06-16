import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FACE_CLUSTER_MIN_MEMBERS,
  FACE_CLUSTER_REBUILD_QUEUE,
  FACE_CLUSTER_SIMILARITY_THRESHOLD,
  FACE_EMBEDDING_QUEUE,
} from '@family/shared';
import { Queue } from 'bullmq';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { buildMvpFaceVector, clusterBySimilarity, cosineSimilarity } from './face-vector.util';
import type { AssignClusterPersonDto } from './face-clustering.dto';

@Injectable()
export class FaceClusteringService {
  private embeddingQueue: Queue | null = null;
  private rebuildQueue: Queue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  private getEmbeddingQueue(): Queue | null {
    if (this.embeddingQueue) return this.embeddingQueue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.embeddingQueue = new Queue(FACE_EMBEDDING_QUEUE, { connection: { url } });
    return this.embeddingQueue;
  }

  private getRebuildQueue(): Queue | null {
    if (this.rebuildQueue) return this.rebuildQueue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.rebuildQueue = new Queue(FACE_CLUSTER_REBUILD_QUEUE, { connection: { url } });
    return this.rebuildQueue;
  }

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  async getPeopleSummary(): Promise<{
    totalFaces: number;
    unassignedFaces: number;
    pendingClusters: number;
    assignedClusters: number;
  }> {
    const workspaceId = this.workspaceContext.requireWorkspaceId();
    const [totalFaces, unassignedFaces, pendingClusters, assignedClusters] = await Promise.all([
      this.prisma.photoFaceTag.count({
        where: { media: { workspaceId, deletedAt: null } },
      }),
      this.prisma.photoFaceTag.count({
        where: { media: { workspaceId, deletedAt: null }, personId: null },
      }),
      this.prisma.faceCluster.count({
        where: { workspaceId, status: 'UNREVIEWED' },
      }),
      this.prisma.faceCluster.count({
        where: { workspaceId, status: 'ASSIGNED' },
      }),
    ]);
    return { totalFaces, unassignedFaces, pendingClusters, assignedClusters };
  }

  async listClusters(status?: string) {
    const workspaceId = this.workspaceContext.requireWorkspaceId();
    const clusters = await this.prisma.faceCluster.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: [{ memberCount: 'desc' }, { updatedAt: 'desc' }],
      include: {
        person: {
          select: { id: true, givenName: true, familyName: true, patronymic: true },
        },
      },
    });

    return clusters.map((c) => ({
      id: c.id,
      status: c.status,
      memberCount: c.memberCount,
      personId: c.personId,
      personName: c.person
        ? [c.person.familyName, c.person.givenName, c.person.patronymic].filter(Boolean).join(' ')
        : null,
      label: c.label,
      lastRebuildAt: c.lastRebuildAt?.toISOString() ?? null,
    }));
  }

  async getCluster(id: string) {
    const workspaceId = this.workspaceContext.requireWorkspaceId();
    const cluster = await this.prisma.faceCluster.findFirst({
      where: { id, workspaceId },
      include: {
        members: {
          include: {
            embedding: {
              include: {
                faceTag: { include: { media: { select: { id: true } } } },
              },
            },
          },
        },
        person: {
          select: { id: true, givenName: true, familyName: true },
        },
      },
    });
    if (!cluster) throw new NotFoundException('Face cluster not found');

    return {
      id: cluster.id,
      status: cluster.status,
      memberCount: cluster.memberCount,
      personId: cluster.personId,
      personName: cluster.person
        ? `${cluster.person.familyName ?? ''} ${cluster.person.givenName}`.trim()
        : null,
      members: cluster.members.map((m) => ({
        embeddingId: m.embeddingId,
        faceTagId: m.embedding.faceTagId,
        mediaId: m.embedding.faceTag.media.id,
        distanceToCentroid: m.distanceToCentroid,
        personId: m.embedding.faceTag.personId,
      })),
    };
  }

  async enqueueRebuild(user: AuthenticatedUser) {
    const workspaceId = this.workspaceContext.requireWorkspaceId();
    const queue = this.getRebuildQueue();
    if (!queue) {
      await this.rebuildClustersInline(workspaceId);
      return { ok: true, mode: 'inline' };
    }
    await queue.add('rebuild', { workspaceId, requestedBy: user.id });
    return { ok: true, mode: 'queued' };
  }

  async rebuildClustersInline(workspaceId: string) {
    const tags = await this.prisma.photoFaceTag.findMany({
      where: { media: { workspaceId, deletedAt: null } },
      include: { media: { select: { id: true } } },
    });

    for (const tag of tags) {
      const vector = buildMvpFaceVector(tag.id, tag.media.id);
      await this.prisma.faceEmbedding.upsert({
        where: { faceTagId: tag.id },
        create: {
          workspaceId,
          faceTagId: tag.id,
          vectorJson: vector,
          status: 'READY',
          qualityScore: tag.confidence ?? 0.5,
        },
        update: {
          vectorJson: vector,
          status: 'READY',
        },
      });
    }

    const embeddings = await this.prisma.faceEmbedding.findMany({
      where: { workspaceId, status: 'READY' },
    });

    await this.prisma.faceClusterMember.deleteMany({
      where: { cluster: { workspaceId } },
    });
    await this.prisma.faceCluster.deleteMany({ where: { workspaceId, status: 'UNREVIEWED' } });

    const clusters = clusterBySimilarity(
      embeddings.map((e) => ({
        id: e.id,
        vector: e.vectorJson as number[],
      })),
      FACE_CLUSTER_SIMILARITY_THRESHOLD,
      FACE_CLUSTER_MIN_MEMBERS,
    );

    for (const group of clusters) {
      const cluster = await this.prisma.faceCluster.create({
        data: {
          workspaceId,
          status: 'UNREVIEWED',
          memberCount: group.memberIds.length,
          lastRebuildAt: new Date(),
        },
      });

      for (const embeddingId of group.memberIds) {
        const emb = embeddings.find((e) => e.id === embeddingId);
        if (!emb) continue;
        const dist = 1 - cosineSimilarity(emb.vectorJson as number[], group.centroid);
        await this.prisma.faceClusterMember.create({
          data: {
            clusterId: cluster.id,
            embeddingId,
            distanceToCentroid: dist,
            isRepresentative: embeddingId === group.memberIds[0],
          },
        });
      }
    }
  }

  async assignPerson(clusterId: string, dto: AssignClusterPersonDto, user: AuthenticatedUser) {
    const workspaceId = this.workspaceContext.requireWorkspaceId();
    const cluster = await this.prisma.faceCluster.findFirst({
      where: { id: clusterId, workspaceId },
      include: { members: { include: { embedding: true } } },
    });
    if (!cluster) throw new NotFoundException('Face cluster not found');

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, workspaceId, deletedAt: null },
    });
    if (!person) throw new NotFoundException('Person not found');

    const embeddingIds = dto.embeddingIds?.length
      ? cluster.members.filter((m) => dto.embeddingIds!.includes(m.embeddingId)).map((m) => m.embeddingId)
      : cluster.members.map((m) => m.embeddingId);

    const faceTagIds = cluster.members
      .filter((m) => embeddingIds.includes(m.embeddingId))
      .map((m) => m.embedding.faceTagId);

    await this.prisma.$transaction([
      ...faceTagIds.map((faceTagId) =>
        this.prisma.photoFaceTag.update({
          where: { id: faceTagId },
          data: { personId: dto.personId },
        }),
      ),
      this.prisma.faceCluster.update({
        where: { id: clusterId },
        data: {
          personId: dto.personId,
          status: 'ASSIGNED',
          assignedById: user.id,
        },
      }),
    ]);

    return this.getCluster(clusterId);
  }

  async enqueueEmbeddingsForMedia(mediaId: string, workspaceId: string) {
    const queue = this.getEmbeddingQueue();
    if (!queue) return;
    await queue.add('embed-media', { mediaId, workspaceId });
  }
}
