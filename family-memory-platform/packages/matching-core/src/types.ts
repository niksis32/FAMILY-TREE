export type MatchReasonType =
  | 'NAME'
  | 'ALT_NAME'
  | 'BIRTH_DATE'
  | 'DEATH_DATE'
  | 'PLACE'
  | 'SPOUSE'
  | 'PARENT'
  | 'CHILD'
  | 'DOCUMENT'
  | 'PHOTO'
  | 'HISTORICAL_PERIOD'
  | 'SOURCE_OVERLAP'
  | 'FAMILY_CONTEXT'
  | 'ML_NAME_SIMILARITY'
  | 'ML_PHONETIC'
  | 'ML_CONTEXT'
  | 'SCORING_BLEND';

export type MatchScoringMethod = 'heuristic' | 'hybrid' | 'ai';

export interface MatchReason {
  type: MatchReasonType;
  weight: number;
  explanation: string;
}

export interface PersonMatchSnapshot {
  personId: string;
  workspaceId?: string;
  privacyLevel?: string;
  isLiving?: boolean;
  givenName: string;
  patronymic?: string | null;
  familyName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  gender?: string | null;
  aliases?: Array<{
    givenName?: string | null;
    patronymic?: string | null;
    familyName?: string | null;
  }>;
  places?: string[];
  spouseNames?: string[];
  parentNames?: string[];
  childNames?: string[];
  sourceIds?: string[];
  documentTitles?: string[];
  avatarMediaId?: string | null;
  historicalPeriod?: { from?: number | null; to?: number | null };
}

export interface MatchScoreResult {
  score: number;
  reasons: MatchReason[];
  scoringMethod?: MatchScoringMethod;
}
