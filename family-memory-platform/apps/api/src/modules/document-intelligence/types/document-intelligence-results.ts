/** In-memory analysis bundle per document (PROMPT 7). Not persisted until confirm flows. */
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
