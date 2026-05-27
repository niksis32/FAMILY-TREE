import { Injectable } from '@nestjs/common';
import {
  CommunityReputationEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Half-life in days for exponential decay of historical reputation events (F2). */
const DECAY_HALF_LIFE_DAYS = 120;

@Injectable()
export class CommunityReputationService {
  constructor(private readonly prisma: PrismaService) {}

  decayFactorForEvent(createdAt: Date, now = new Date()): number {
    const days = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.pow(0.5, days / DECAY_HALF_LIFE_DAYS);
  }

  async recordEvent(params: {
    userId: string;
    groupId: string;
    type: CommunityReputationEventType;
    baseWeight: number;
    note?: string;
    relatedPostId?: string;
    relatedThreadId?: string;
  }) {
    const decayMultiplier = 1;
    return this.prisma.communityReputationEvent.create({
      data: {
        userId: params.userId,
        groupId: params.groupId,
        type: params.type,
        baseWeight: params.baseWeight,
        decayMultiplier,
        note: params.note,
        relatedPostId: params.relatedPostId,
        relatedThreadId: params.relatedThreadId,
      },
    });
  }

  async scoreInGroup(userId: string, groupId: string): Promise<number> {
    const events = await this.prisma.communityReputationEvent.findMany({
      where: { userId, groupId },
      select: { baseWeight: true, createdAt: true },
    });
    let sum = 0;
    const now = new Date();
    for (const e of events) {
      sum += e.baseWeight * this.decayFactorForEvent(e.createdAt, now);
    }
    return Math.round(sum * 100) / 100;
  }

  async canPostInGroup(userId: string, groupId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const score = await this.scoreInGroup(userId, groupId);
    if (score < -50) {
      return { ok: false, reason: 'Reputation in this group is too low to post. Contact a moderator.' };
    }
    const strike = await this.prisma.communityUserStrike.findUnique({ where: { userId } });
    if (strike && strike.strikeCount >= 3) {
      return { ok: false, reason: 'Account has multiple moderation strikes. Posting is restricted.' };
    }
    return { ok: true };
  }

  async addStrike(userId: string, delta = 1) {
    await this.prisma.communityUserStrike.upsert({
      where: { userId },
      create: { userId, strikeCount: delta, lastStrikeAt: new Date() },
      update: { strikeCount: { increment: delta }, lastStrikeAt: new Date() },
    });
  }

  async penaltyForUserInGroup(userId: string, groupId: string, weight = -5, note?: string) {
    await this.recordEvent({
      userId,
      groupId,
      type: CommunityReputationEventType.MODERATION_PENALTY,
      baseWeight: weight,
      note,
    });
  }
}
