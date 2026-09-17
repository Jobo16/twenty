import { type MemberMembership } from '../organization/member-membership';
import { type TenantStatus } from '../tenant/tenant-lifecycle';
import { type DataScope } from './customer-access-policy';
import { type PermissionAction } from './permission-action';

// The tenant of the data being protected is part of the request and is never
// inferred from the subject. A decision that cannot name that tenant has no
// basis on which to allow anything.
export type ResourceContext = {
  tenantId: string | null;
  ownerMemberId: string | null;
  ownerTeamId: string | null;
  ownerDepartmentId: string | null;
};

// The tenant status travels with the subject because a suspended tenant must
// stop serving traffic even though its members and roles are still on disk.
export type AccessSubject = {
  tenantId: string | null;
  tenantStatus: TenantStatus | null;
  membership: MemberMembership | null;
};

export const RESOURCE_ACCESS_DENIAL_REASONS = [
  'TENANT_CONTEXT_REQUIRED',
  'SUBJECT_TENANT_REQUIRED',
  'TENANT_NOT_OPERABLE',
  'MEMBERSHIP_REQUIRED',
  'MEMBER_NOT_OPERABLE',
  'MEMBERSHIP_TENANT_MISMATCH',
  'ACTION_NOT_GRANTED_TO_ROLE',
  'TENANT_MISMATCH',
  'RESOURCE_OUT_OF_SCOPE',
] as const;

export type ResourceAccessDenialReason =
  (typeof RESOURCE_ACCESS_DENIAL_REASONS)[number];

// Denials carry a stable code rather than prose so that callers, tests and
// audit records branch on the same vocabulary the decision was made with.
export type ResourceAccessDecision =
  | {
      allowed: true;
      action: PermissionAction;
      dataScope: DataScope;
    }
  | {
      allowed: false;
      action: PermissionAction;
      reason: ResourceAccessDenialReason;
    };
