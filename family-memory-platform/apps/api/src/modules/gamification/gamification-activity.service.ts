import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from './achievement.service';
import { ProgressCalculatorService } from './progress-calculator.service';

export interface ActivityRecordInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class GamificationActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly achievementService: AchievementService,
  ) {}

  async record(input: ActivityRecordInput): Promise<void> {
    await this.prisma.gamificationEvent.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });

    if (input.userId) {
      const metrics = await this.progressCalculator.collectMetrics();
      await this.achievementService.checkAndUnlock(input.userId, metrics);
    }
  }
}
