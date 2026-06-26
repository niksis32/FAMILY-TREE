export interface HealthCheckResult {
  ok: boolean;
  error?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface AdminOpsOverview {
  timestamp: string;
  health: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    minio: HealthCheckResult;
    meilisearch: HealthCheckResult;
  };
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
  recentErrors: Array<{
    id: string;
    requestId: string | null;
    statusCode: number;
    method: string | null;
    path: string | null;
    message: string;
    createdAt: string;
  }>;
}

export interface WorkspaceExportJobSummary {
  id: string;
  workspaceId: string;
  status: string;
  downloadUrl: string | null;
  downloadExpiresAt: string | null;
  error: string | null;
  manifest?: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}
