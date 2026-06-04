/**
 * Prisma unchecked rows omit workspaceId in service code;
 * workspaceIsolationExtension injects it on create/createMany when X-Workspace-Id is set.
 */
export type WorkspaceScopedUncheckedCreate<T extends { workspaceId: string }> = Omit<T, 'workspaceId'>;

export function workspaceScopedCreateData<T extends { workspaceId: string }>(
  data: WorkspaceScopedUncheckedCreate<T>,
): T {
  return data as T;
}
