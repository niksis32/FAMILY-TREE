/** Persisted analysis bundle per document (PostgreSQL + optional Redis cache). */
export interface DocumentIntelligenceAnalysisEntry {
  ocr?: unknown;
  entities?: unknown;
  events?: unknown;
  relationships?: unknown;
  summary?: unknown;
  /** Keys: `event:id`, `relationship:id`, `entity:id` */
  rejected: Set<string>;
  updatedAt: string;
}
