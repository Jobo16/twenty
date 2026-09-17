export type PermissionRole =
  | 'SALES'
  | 'TEAM_LEAD'
  | 'DEPARTMENT_HEAD'
  | 'TENANT_ADMIN'
  | 'PLATFORM_OPERATOR';

export type DataScope = 'OWN' | 'TEAM' | 'DEPARTMENT' | 'WORKSPACE';

// The operator reaching the policy: who they are, which role they act in, and
// the org axes that role may see. Team/department are null when the persona is
// not tied to one, e.g. a tenant admin who spans every team.
export type OperatorContext = {
  memberId: string;
  role: PermissionRole;
  workspaceId: string;
  teamId: string | null;
  departmentId: string | null;
};

// What the decision is made against: the customer's workspace plus the current
// owner projection and that owner's own team/department.
export type CustomerContext = {
  workspaceId: string;
  currentOwnerMemberId: string | null;
  currentOwnerTeamId: string | null;
  currentOwnerDepartmentId: string | null;
};

export type CustomerAccessDecision =
  | {
      allowed: true;
      allowedScope: DataScope;
    }
  | {
      allowed: false;
      reason: string;
    };

export const PLATFORM_OPERATOR_BUSINESS_DENIAL =
  'PLATFORM_OPERATOR has no access to business customer data';

// The widest slice of customer data a role may reach. Platform operators get
// no business scope: cross-tenant admin is a separate, audited capability that
// must be granted explicitly, never by default.
const ROLE_SCOPE: Record<PermissionRole, DataScope | null> = {
  SALES: 'OWN',
  TEAM_LEAD: 'TEAM',
  DEPARTMENT_HEAD: 'DEPARTMENT',
  TENANT_ADMIN: 'WORKSPACE',
  PLATFORM_OPERATOR: null,
};

export function isAllowedByScope(
  scope: DataScope,
  operator: OperatorContext,
  customer: CustomerContext,
): boolean {
  switch (scope) {
    case 'OWN':
      return (
        customer.currentOwnerMemberId !== null &&
        operator.memberId === customer.currentOwnerMemberId
      );
    case 'TEAM':
      return (
        operator.teamId !== null &&
        customer.currentOwnerTeamId !== null &&
        operator.teamId === customer.currentOwnerTeamId
      );
    case 'DEPARTMENT':
      return (
        operator.departmentId !== null &&
        customer.currentOwnerDepartmentId !== null &&
        operator.departmentId === customer.currentOwnerDepartmentId
      );
    // A workspace-scoped operator sees every customer inside the workspace;
    // the cross-workspace check is handled by decideCustomerAccess.
    case 'WORKSPACE':
      return true;
  }
}

export function decideCustomerAccess(
  operator: OperatorContext,
  customer: CustomerContext,
): CustomerAccessDecision {
  // Platform operators never inherit business access from membership, team or
  // department overlap. Fail closed by default.
  if (operator.role === 'PLATFORM_OPERATOR') {
    return {
      allowed: false,
      reason: PLATFORM_OPERATOR_BUSINESS_DENIAL,
    };
  }

  // First-layer isolation is the workspace schema; the policy refuses anything
  // that would cross into another tenant.
  if (operator.workspaceId !== customer.workspaceId) {
    return {
      allowed: false,
      reason: 'operator workspace does not match the customer workspace',
    };
  }

  const scope = ROLE_SCOPE[operator.role];

  if (scope === null) {
    return {
      allowed: false,
      reason: `role ${operator.role} has no business customer data scope`,
    };
  }

  if (isAllowedByScope(scope, operator, customer)) {
    return { allowed: true, allowedScope: scope };
  }

  return {
    allowed: false,
    reason: `role ${operator.role} (${scope} scope) cannot access this customer`,
  };
}
