import type { MatchReason, MatchScoreResult } from './types';

const HEURISTIC_WEIGHT = 0.65;
const AI_WEIGHT = 0.35;

/** Blend explainable heuristic score with AI-service refinement (production hybrid path). */
export function mergeHybridMatchScore(
  heuristic: MatchScoreResult,
  ai: Pick<MatchScoreResult, 'score' | 'reasons'>,
): MatchScoreResult {
  const blended = Math.min(0.99, heuristic.score * HEURISTIC_WEIGHT + ai.score * AI_WEIGHT);
  if (blended < 0.35) {
    return { score: 0, reasons: [], scoringMethod: 'hybrid' };
  }

  const reasons: MatchReason[] = [
    ...heuristic.reasons,
    ...ai.reasons,
    {
      type: 'SCORING_BLEND',
      weight: 0,
      explanation: `Hybrid score ${Math.round(blended * 100)}% (heuristic ${Math.round(heuristic.score * 100)}% + AI ${Math.round(ai.score * 100)}%)`,
    },
  ];

  return { score: blended, reasons, scoringMethod: 'hybrid' };
}
