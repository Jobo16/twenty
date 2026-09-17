import { type PermissionRole } from './customer-access-policy';

export const PERMISSION_ACTIONS = [
  'CUSTOMER_READ',
  'CUSTOMER_UPDATE',
  'CUSTOMER_CLAIM',
  'CUSTOMER_TRANSFER',
  'CUSTOMER_EXPORT',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// Capability answers "may this role ever perform this action", which is a
// different question from "which rows may it reach". Export is the first action
// withheld from the sales roles because it moves data out of the tenant in
// bulk, and a platform operator holds no business capability at all: the
// cross-tenant power it needs is a separate, audited grant and never a role
// default.
const ROLE_CAPABILITIES: Record<PermissionRole, readonly PermissionAction[]> = {
  SALES: ['CUSTOMER_READ', 'CUSTOMER_UPDATE', 'CUSTOMER_CLAIM'],
  TEAM_LEAD: [
    'CUSTOMER_READ',
    'CUSTOMER_UPDATE',
    'CUSTOMER_CLAIM',
    'CUSTOMER_TRANSFER',
  ],
  DEPARTMENT_HEAD: [
    'CUSTOMER_READ',
    'CUSTOMER_UPDATE',
    'CUSTOMER_CLAIM',
    'CUSTOMER_TRANSFER',
  ],
  TENANT_ADMIN: [...PERMISSION_ACTIONS],
  PLATFORM_OPERATOR: [],
};

export function isActionGrantedToRole(
  role: PermissionRole,
  action: PermissionAction,
): boolean {
  return ROLE_CAPABILITIES[role].includes(action);
}
