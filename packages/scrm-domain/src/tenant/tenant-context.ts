export type TenantContext = {
  workspaceId: string;
  wecomConnectionId?: string;
};

export function requireTenantContext(context: TenantContext): TenantContext {
  if (context.workspaceId.trim().length === 0) {
    throw new Error('workspaceId is required');
  }

  return context;
}

export function tenantResourceKey(
  context: TenantContext,
  resourceType: string,
  resourceId: string,
): string {
  requireTenantContext(context);

  if (resourceType.trim().length === 0 || resourceId.trim().length === 0) {
    throw new Error('resourceType and resourceId are required');
  }

  return JSON.stringify([context.workspaceId, resourceType, resourceId]);
}
