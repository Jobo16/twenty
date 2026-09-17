import {
  isMemberOperable,
  isMembershipOfTenant,
} from '../organization/member-membership';
import {
  isTenantOperable,
  normalizeTenantId,
} from '../tenant/tenant-lifecycle';
import {
  decideCustomerAccess,
  type CustomerContext,
  type OperatorContext,
} from './customer-access-policy';
import {
  isActionGrantedToRole,
  type PermissionAction,
} from './permission-action';
import {
  type AccessSubject,
  type ResourceAccessDecision,
  type ResourceAccessDenialReason,
  type ResourceContext,
} from './resource-access-contract';

export type DecideResourceAccessInput = {
  action: PermissionAction;
  subject: AccessSubject;
  resource: ResourceContext;
};

function denyResourceAccess(
  action: PermissionAction,
  reason: ResourceAccessDenialReason,
): ResourceAccessDecision {
  return { allowed: false, action, reason };
}

// Every gate below can only refuse: there is no default allow and no branch
// that reaches the scope policy without a named tenant, an operable tenant, an
// operable membership bound to that tenant, and a role that holds the action.
// The checks run in that order so the reported reason is the outermost reason,
// which is the one the caller can act on.
export function decideResourceAccess(
  input: DecideResourceAccessInput,
): ResourceAccessDecision {
  const { action, subject, resource } = input;

  const resourceTenantId = normalizeTenantId(resource.tenantId);

  if (resourceTenantId === null) {
    return denyResourceAccess(action, 'TENANT_CONTEXT_REQUIRED');
  }

  const subjectTenantId = normalizeTenantId(subject.tenantId);

  if (subjectTenantId === null) {
    return denyResourceAccess(action, 'SUBJECT_TENANT_REQUIRED');
  }

  if (
    subject.tenantStatus === null ||
    !isTenantOperable(subject.tenantStatus)
  ) {
    return denyResourceAccess(action, 'TENANT_NOT_OPERABLE');
  }

  const membership = subject.membership;

  if (membership === null) {
    return denyResourceAccess(action, 'MEMBERSHIP_REQUIRED');
  }

  if (!isMemberOperable(membership.status)) {
    return denyResourceAccess(action, 'MEMBER_NOT_OPERABLE');
  }

  if (!isMembershipOfTenant(membership, subjectTenantId)) {
    return denyResourceAccess(action, 'MEMBERSHIP_TENANT_MISMATCH');
  }

  // Capability is checked before scope so a role that may never perform the
  // action is refused even when the row itself would have been in scope.
  if (!isActionGrantedToRole(membership.role, action)) {
    return denyResourceAccess(action, 'ACTION_NOT_GRANTED_TO_ROLE');
  }

  const operator: OperatorContext = {
    memberId: membership.memberId,
    role: membership.role,
    // Tenant and workspace are the same isolation boundary in this product, so
    // the resolved tenant id is what the scope policy compares on.
    workspaceId: subjectTenantId,
    teamId: membership.teamId,
    departmentId: membership.departmentId,
  };

  const resourceCustomer: CustomerContext = {
    workspaceId: resourceTenantId,
    currentOwnerMemberId: resource.ownerMemberId,
    currentOwnerTeamId: resource.ownerTeamId,
    currentOwnerDepartmentId: resource.ownerDepartmentId,
  };

  const scopeDecision = decideCustomerAccess(operator, resourceCustomer);

  if (!scopeDecision.allowed) {
    // The scope policy folds isolation and reach into one refusal, so the two
    // are separated here to keep the caller's branch decision machine-readable.
    return denyResourceAccess(
      action,
      subjectTenantId === resourceTenantId
        ? 'RESOURCE_OUT_OF_SCOPE'
        : 'TENANT_MISMATCH',
    );
  }

  return {
    allowed: true,
    action,
    dataScope: scopeDecision.allowedScope,
  };
}
