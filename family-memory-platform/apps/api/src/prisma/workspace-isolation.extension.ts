import { Prisma } from '@prisma/client';
import type { WorkspaceContextSnapshot } from './workspace-context.service';

const READ_OPERATIONS = [
  'findMany',
  'findFirst',
  'findUnique',
  'findUniqueOrThrow',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
] as const;

const WRITE_OPERATIONS = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'] as const;

function mergeWhere(args: { where?: Record<string, unknown> }, workspaceId: string) {
  args.where = { ...(args.where ?? {}), workspaceId };
}

function mergeCreateData(args: { data?: Record<string, unknown> | Record<string, unknown>[] }, workspaceId: string) {
  if (Array.isArray(args.data)) {
    args.data = args.data.map((row) => ({ ...row, workspaceId }));
    return;
  }
  args.data = { ...(args.data ?? {}), workspaceId };
}

function wrapOperation(
  getSnapshot: () => WorkspaceContextSnapshot,
  operation: string,
  handler: (args: { args: Record<string, unknown>; query: (a: Record<string, unknown>) => Promise<unknown> }) => Promise<unknown>,
) {
  return async (params: {
    args: Record<string, unknown>;
    query: (a: Record<string, unknown>) => Promise<unknown>;
  }) => {
    const snapshot = getSnapshot();
    if (snapshot.bypass || !snapshot.workspaceId) {
      return handler(params);
    }

    const workspaceId = snapshot.workspaceId;
    const args = { ...params.args };

    if ((READ_OPERATIONS as readonly string[]).includes(operation)) {
      mergeWhere(args, workspaceId);
    } else if (operation === 'create' || operation === 'createMany') {
      mergeCreateData(args, workspaceId);
    } else if (operation === 'upsert') {
      mergeWhere(args, workspaceId);
      const upsertArgs = args as { create?: Record<string, unknown>; update?: Record<string, unknown> };
      upsertArgs.create = { ...(upsertArgs.create ?? {}), workspaceId };
    } else if ((WRITE_OPERATIONS as readonly string[]).includes(operation)) {
      mergeWhere(args, workspaceId);
    }

    return params.query(args);
  };
}

function modelHandlers(getSnapshot: () => WorkspaceContextSnapshot) {
  const handlers: Record<string, (params: {
    args: Record<string, unknown>;
    query: (a: Record<string, unknown>) => Promise<unknown>;
  }) => Promise<unknown>> = {};
  const operations = [...READ_OPERATIONS, ...WRITE_OPERATIONS];

  for (const operation of operations) {
    handlers[operation] = wrapOperation(getSnapshot, operation, ({ args, query }) => query(args));
  }

  return handlers;
}

/** Models with direct `workspaceId` — auto-filtered when X-Workspace-Id context is set. */
const WORKSPACE_SCOPED_MODELS = [
  'person',
  'media',
  'document',
  'family',
  'familyMember',
  'relationship',
  'event',
  'source',
  'citation',
  'timelineItem',
] as const;

export function workspaceIsolationExtension(getSnapshot: () => WorkspaceContextSnapshot) {
  const handlers = modelHandlers(getSnapshot);
  const query = Object.fromEntries(
    WORKSPACE_SCOPED_MODELS.map((model) => [model, handlers]),
  ) as Record<(typeof WORKSPACE_SCOPED_MODELS)[number], typeof handlers>;

  return Prisma.defineExtension({
    name: 'workspaceIsolation',
    query,
  });
}
