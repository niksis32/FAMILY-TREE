import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ONBOARDING_STEPS,
  type OnboardingProgressDto,
  type OnboardingStepId,
} from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import type { UpdateOnboardingProgressDto } from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  async getProgress(userId: string): Promise<OnboardingProgressDto> {
    const workspaceId = this.requireWorkspaceId();
    const row = await this.prisma.onboardingProgress.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, currentStep: 'welcome' },
      update: {},
    });
    return this.toDto(row);
  }

  async updateProgress(userId: string, dto: UpdateOnboardingProgressDto): Promise<OnboardingProgressDto> {
    const workspaceId = this.requireWorkspaceId();
    const existing = await this.prisma.onboardingProgress.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, currentStep: 'welcome' },
      update: {},
    });

    const completedSteps = [...this.asStepArray(existing.completedSteps)];
    const skippedSteps = [...this.asStepArray(existing.skippedSteps)];
    let currentStep = existing.currentStep as OnboardingStepId;
    let isCompleted = existing.isCompleted;
    const payload = {
      ...(existing.payload as Record<string, unknown>),
      ...(dto.payload ?? {}),
    };

    if (dto.completeStep && ONBOARDING_STEPS.includes(currentStep)) {
      if (!completedSteps.includes(currentStep)) completedSteps.push(currentStep);
      const idx = ONBOARDING_STEPS.indexOf(currentStep);
      currentStep = ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)] ?? 'complete';
    }

    if (dto.skipStep && ONBOARDING_STEPS.includes(currentStep)) {
      if (!skippedSteps.includes(currentStep)) skippedSteps.push(currentStep);
      const idx = ONBOARDING_STEPS.indexOf(currentStep);
      currentStep = ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)] ?? 'complete';
    }

    if (dto.currentStep && ONBOARDING_STEPS.includes(dto.currentStep as OnboardingStepId)) {
      currentStep = dto.currentStep as OnboardingStepId;
    }

    if (dto.markCompleted || currentStep === 'complete') {
      isCompleted = true;
      if (!completedSteps.includes('complete')) completedSteps.push('complete');
    }

    const updated = await this.prisma.onboardingProgress.update({
      where: { id: existing.id },
      data: {
        currentStep,
        completedSteps,
        skippedSteps,
        isCompleted,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    return this.toDto(updated);
  }

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new NotFoundException('Workspace context required');
    return workspaceId;
  }

  private asStepArray(value: unknown): OnboardingStepId[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is OnboardingStepId => typeof v === 'string');
  }

  private toDto(row: {
    id: string;
    userId: string;
    workspaceId: string;
    currentStep: string;
    completedSteps: unknown;
    skippedSteps: unknown;
    isCompleted: boolean;
    payload: unknown;
    updatedAt: Date;
  }): OnboardingProgressDto {
    return {
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      currentStep: row.currentStep as OnboardingStepId,
      completedSteps: this.asStepArray(row.completedSteps),
      skippedSteps: this.asStepArray(row.skippedSteps),
      isCompleted: row.isCompleted,
      payload: (row.payload as Record<string, unknown>) ?? {},
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
