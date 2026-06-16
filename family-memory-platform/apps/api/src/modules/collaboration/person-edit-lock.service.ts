import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PERSON_EDIT_LOCK_TTL_SEC, REALTIME_EVENTS, type RealtimeEnvelope } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { RealtimePubSubService } from '../realtime/realtime-pubsub.service';

@Injectable()
export class PersonEditLockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly pubsub: RealtimePubSubService,
  ) {}

  async acquire(personId: string, userId: string, field?: string) {
    const snapshot = this.workspaceContext.getSnapshot();
    if (!snapshot.workspaceId) throw new ForbiddenException('Workspace context required');

    await this.prisma.personEditLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const existing = await this.prisma.personEditLock.findFirst({
      where: { personId, field: field ?? null },
      include: { user: { select: { displayName: true } } },
    });

    if (existing && existing.userId !== userId && existing.expiresAt > new Date()) {
      throw new ConflictException({
        message: 'Person field is locked by another user',
        lock: this.toSummary(existing),
      });
    }

    const expiresAt = new Date(Date.now() + PERSON_EDIT_LOCK_TTL_SEC * 1000);
    const existingLock = await this.prisma.personEditLock.findFirst({
      where: { personId, field: field ?? null },
    });
    const lock = existingLock
      ? await this.prisma.personEditLock.update({
          where: { id: existingLock.id },
          data: { userId, expiresAt, acquiredAt: new Date() },
          include: { user: { select: { displayName: true } } },
        })
      : await this.prisma.personEditLock.create({
          data: {
            workspaceId: snapshot.workspaceId,
            personId,
            userId,
            field: field ?? null,
            expiresAt,
          },
          include: { user: { select: { displayName: true } } },
        });

    const summary = this.toSummary(lock);
    await this.pubsub.publishWorkspace(snapshot.workspaceId, {
      event: REALTIME_EVENTS.PERSON_LOCK,
      workspaceId: snapshot.workspaceId,
      payload: summary,
      emittedAt: new Date().toISOString(),
    } satisfies RealtimeEnvelope);

    return summary;
  }

  async release(personId: string, userId: string, field?: string) {
    const snapshot = this.workspaceContext.getSnapshot();
    const lock = await this.prisma.personEditLock.findFirst({
      where: { personId, field: field ?? null },
    });
    if (!lock || lock.userId !== userId) return { ok: true };

    await this.prisma.personEditLock.delete({ where: { id: lock.id } });
    if (snapshot.workspaceId) {
      await this.pubsub.publishWorkspace(snapshot.workspaceId, {
        event: REALTIME_EVENTS.PERSON_UNLOCK,
        workspaceId: snapshot.workspaceId,
        payload: { personId, field: field ?? null, userId },
        emittedAt: new Date().toISOString(),
      } satisfies RealtimeEnvelope);
    }
    return { ok: true };
  }

  async getLock(personId: string) {
    await this.prisma.personEditLock.deleteMany({
      where: { personId, expiresAt: { lt: new Date() } },
    });
    const lock = await this.prisma.personEditLock.findFirst({
      where: { personId, field: null },
      include: { user: { select: { displayName: true } } },
    });
    return lock ? this.toSummary(lock) : null;
  }

  async assertCanEdit(personId: string, userId: string, expectedVersion?: number) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { updatedAt: true, workspaceId: true },
    });
    if (!person) return;

    const lock = await this.getLock(personId);
    if (lock && lock.userId !== userId) {
      throw new ConflictException({ message: 'Person is being edited by another user', lock });
    }

    if (expectedVersion !== undefined) {
      const version = Math.floor(person.updatedAt.getTime() / 1000);
      if (version !== expectedVersion) {
        const snapshot = this.workspaceContext.getSnapshot();
        if (snapshot.workspaceId) {
          await this.pubsub.publishWorkspace(snapshot.workspaceId, {
            event: REALTIME_EVENTS.PERSON_CONFLICT,
            workspaceId: snapshot.workspaceId,
            payload: { personId, expectedVersion, actualVersion: version },
            emittedAt: new Date().toISOString(),
          } satisfies RealtimeEnvelope);
        }
        throw new ConflictException({
          message: 'Person was modified by another user',
          expectedVersion,
          actualVersion: version,
        });
      }
    }
  }

  personVersion(updatedAt: Date) {
    return Math.floor(updatedAt.getTime() / 1000);
  }

  private toSummary(lock: {
    personId: string;
    userId: string;
    field: string | null;
    acquiredAt: Date;
    expiresAt: Date;
    user: { displayName: string | null };
  }) {
    return {
      personId: lock.personId,
      userId: lock.userId,
      userName: lock.user.displayName,
      field: lock.field,
      acquiredAt: lock.acquiredAt.toISOString(),
      expiresAt: lock.expiresAt.toISOString(),
    };
  }
}
