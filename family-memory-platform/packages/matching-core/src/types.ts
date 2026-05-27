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
  | 'FAMILY_CONTEXT';

export interface MatchReason {
  type: MatchReasonType;
  weight: number;
  explanation: string;
}

export interface PersonMatchSnapshot {
  personId: string;
  workspaceId?: string;
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
}
