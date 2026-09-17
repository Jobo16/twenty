import { type PermissionRole } from '../permissions/customer-access-policy';
import { normalizeTenantId } from '../tenant/tenant-lifecycle';

export const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'REMOVED'] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

// A membership is the join between a person and one tenant. Team and department
// are optional because a tenant admin spans every team, and null must stay
// distinguishable from "belongs to no team yet".
export type MemberMembership = {
  memberId: string;
  tenantId: string;
  role: PermissionRole;
  status: MemberStatus;
  teamId: string | null;
  departmentId: string | null;
};

// Suspended and removed members keep their history but must not act, so the
// status travels with the membership instead of being inferred from the role.
export function isMemberOperable(status: MemberStatus): boolean {
  return status === 'ACTIVE';
}

// A membership names its own tenant. Combining a member resolved from another
// tenant's directory with the caller's tenant context would silently hand over
// that tenant's data scope, so the two ids are compared rather than trusted.
export function isMembershipOfTenant(
  membership: MemberMembership,
  tenantId: string | null,
): boolean {
  const normalizedTenantId = normalizeTenantId(tenantId);

  if (normalizedTenantId === null) {
    return false;
  }

  return normalizeTenantId(membership.tenantId) === normalizedTenantId;
}
