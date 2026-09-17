export const TENANT_STATUSES = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

export type TenantLifecycle = {
  tenantId: string;
  status: TenantStatus;
};

// Only an ACTIVE tenant serves business traffic. A suspended tenant keeps its
// data and can be reactivated, so reachability is decided from the status at
// decision time rather than from the tenant row existing.
export function isTenantOperable(status: TenantStatus): boolean {
  return status === 'ACTIVE';
}

// "We could not resolve the tenant" and "the tenant is empty" must not collapse
// into the same value, because both lead to a denial but only one of them is a
// caller bug worth surfacing.
export function normalizeTenantId(
  tenantId: string | null | undefined,
): string | null {
  if (tenantId === null || tenantId === undefined) {
    return null;
  }

  const trimmedTenantId = tenantId.trim();

  return trimmedTenantId.length === 0 ? null : trimmedTenantId;
}
