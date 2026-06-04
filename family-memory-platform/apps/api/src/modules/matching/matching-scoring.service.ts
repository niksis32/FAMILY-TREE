import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  mergeHybridMatchScore,
  scorePersonMatch,
  type MatchReason,
  type PersonMatchSnapshot,
} from '@family/matching-core';
import type { MatchReasonDto } from '@family/shared';
import type { AiRequestAudit } from '../ai/ai.service';
import { AiService } from '../ai/ai.service';

type AiPairScore = {
  score: number;
  reasons: MatchReasonDto[];
  method?: string;
};

@Injectable()
export class MatchingScoringService {
  private readonly logger = new Logger(MatchingScoringService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ai: AiService,
  ) {}

  isAiScoringEnabled(): boolean {
    return (
      this.config.get<string>('MATCHING_AI_SCORING_ENABLED') === 'true' && this.ai.isAiEnabled()
    );
  }

  async scorePair(
    source: PersonMatchSnapshot,
    target: PersonMatchSnapshot,
    audit?: AiRequestAudit,
  ) {
    const heuristic = scorePersonMatch(source, target);
    heuristic.scoringMethod = 'heuristic';

    if (!this.isAiScoringEnabled() || !audit?.userId) {
      return heuristic;
    }

    try {
      const result = await this.ai.scorePersonPair(
        { source: this.toAiPayload(source), target: this.toAiPayload(target) },
        audit,
      );
      const data = this.ai.extractData<AiPairScore>(result);
      if (!data || data.score <= 0) {
        return heuristic;
      }

      return mergeHybridMatchScore(heuristic, {
        score: data.score,
        reasons: (data.reasons ?? []) as MatchReason[],
      });
    } catch (err) {
      this.logger.warn(`AI matching score fallback: ${(err as Error).message}`);
      return heuristic;
    }
  }

  private toAiPayload(snapshot: PersonMatchSnapshot) {
    return {
      personId: snapshot.personId,
      givenName: snapshot.givenName,
      patronymic: snapshot.patronymic,
      familyName: snapshot.familyName,
      birthDate: snapshot.birthDate,
      deathDate: snapshot.deathDate,
      places: snapshot.places ?? [],
      spouseNames: snapshot.spouseNames ?? [],
      parentNames: snapshot.parentNames ?? [],
      childNames: snapshot.childNames ?? [],
    };
  }
}
