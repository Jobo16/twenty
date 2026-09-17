import { customerIdentityKey } from '../customer/customer-identity';
import {
  requireTenantContext,
  type TenantContext,
} from '../tenant/tenant-context';
import { requireIsoTimestamp } from '../wecom/wecom-time';
import type { SidebarWecomIdentity } from './sidebar-session';

export type SidebarResolutionFailureReason =
  | 'identity-matches-multiple-customers'
  | 'cross-tenant-identity';

export type SidebarCustomerResolution =
  | {
      status: 'resolved';
      identityKey: string;
      customerId: string;
      resolvedAt: string;
    }
  | {
      status: 'unresolved';
      reason: 'identity-not-found';
      identityKey: string;
      resolvedAt: string;
    }
  | {
      status: 'conflict';
      reason: SidebarResolutionFailureReason;
      identityKey: string;
      resolvedAt: string;
    };

// What the adapter observed for one external identity. Matching happens outside
// the domain; this is the evidence the domain reasons over.
export type SidebarCustomerLookup = {
  tenant: TenantContext;
  identity: SidebarWecomIdentity;
  // Customer ids the adapter matched inside the tenant.
  matchedCustomerIds: readonly string[];
  // The workspace that already owns this external id in some other tenant, when
  // the adapter observed one.
  crossTenantWorkspaceId: string | null;
  resolvedAt: string;
};

const isBlank = (value: string): boolean => value.trim().length === 0;

export function resolveSidebarCustomer(
  lookup: SidebarCustomerLookup,
): SidebarCustomerResolution {
  const tenant = requireTenantContext(lookup.tenant);
  const resolvedAt = requireIsoTimestamp(lookup.resolvedAt, 'resolvedAt');

  const identityKey = customerIdentityKey({
    connectionId: lookup.identity.connectionId,
    provider: 'WECOM_EXTERNAL_CONTACT',
    externalId: lookup.identity.externalUserId,
  });

  // Checked before any in-tenant match: honouring a local match when the same
  // external id is already owned elsewhere would move a customer across tenants.
  if (
    lookup.crossTenantWorkspaceId !== null &&
    lookup.crossTenantWorkspaceId !== tenant.workspaceId
  ) {
    return {
      status: 'conflict',
      reason: 'cross-tenant-identity',
      identityKey,
      resolvedAt,
    };
  }

  // A blank id is an adapter defect. Dropping it fails closed into
  // identity-not-found rather than resolving a customer that does not exist.
  const customerIds = [
    ...new Set(lookup.matchedCustomerIds.filter((id) => !isBlank(id))),
  ];

  if (customerIds.length === 0) {
    return {
      status: 'unresolved',
      reason: 'identity-not-found',
      identityKey,
      resolvedAt,
    };
  }

  // Two customers claiming one identity means the merge question is unanswered.
  // Writing to either would silently pick a side, so both are refused.
  if (customerIds.length > 1) {
    return {
      status: 'conflict',
      reason: 'identity-matches-multiple-customers',
      identityKey,
      resolvedAt,
    };
  }

  return {
    status: 'resolved',
    identityKey,
    customerId: customerIds[0],
    resolvedAt,
  };
}
