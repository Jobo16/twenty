import type { TenantContext } from '../tenant/tenant-context';
import type { SidebarCustomerResolution } from './resolve-sidebar-customer';
import type { SidebarSession, SidebarWecomIdentity } from './sidebar-session';

export type SidebarContextBlockReason =
  | 'identity-not-found'
  | 'identity-matches-multiple-customers'
  | 'cross-tenant-identity';

// A context is the resolved binding of tenant, operator, WeCom identity and
// customer. Only `ready` contexts may back a write.
export type ReadySidebarContext = {
  status: 'ready';
  sessionId: string;
  tenant: TenantContext;
  operatorMemberId: string;
  wecomIdentity: SidebarWecomIdentity;
  identityKey: string;
  customerId: string;
  resolvedAt: string;
};

export type BlockedSidebarContext = {
  status: 'blocked';
  sessionId: string;
  tenant: TenantContext;
  operatorMemberId: string;
  wecomIdentity: SidebarWecomIdentity;
  identityKey: string;
  reason: SidebarContextBlockReason;
  resolvedAt: string;
};

export type SidebarContext = ReadySidebarContext | BlockedSidebarContext;

export function isReadySidebarContext(
  context: SidebarContext,
): context is ReadySidebarContext {
  return context.status === 'ready';
}

export function buildSidebarContext(
  session: SidebarSession,
  resolution: SidebarCustomerResolution,
): SidebarContext {
  const binding = {
    sessionId: session.sessionId,
    tenant: session.tenant,
    operatorMemberId: session.operatorMemberId,
    wecomIdentity: session.wecomIdentity,
    identityKey: resolution.identityKey,
    resolvedAt: resolution.resolvedAt,
  };

  if (resolution.status === 'resolved') {
    return { ...binding, status: 'ready', customerId: resolution.customerId };
  }

  // An unresolved or conflicting identity keeps the reason instead of a
  // customer, so callers cannot read a customer id that was never resolved.
  return { ...binding, status: 'blocked', reason: resolution.reason };
}

export type SidebarContextReResolveReason =
  | 'no-previous-context'
  | 'operator-changed'
  | 'wecom-identity-changed'
  | 'previous-context-blocked';

export type SidebarContextRefresh =
  | { status: 'reuse'; context: ReadySidebarContext }
  | { status: 're-resolve'; reasons: SidebarContextReResolveReason[] }
  | { status: 'reset'; reason: 'tenant-changed' };

// A reopened sidebar may keep its resolved customer only while tenant, operator
// and WeCom identity are unchanged. Anything else must go back to resolution:
// reusing the cached customer is how a switched operator writes to the wrong one.
export function refreshSidebarContext(input: {
  previous: SidebarContext | null;
  session: SidebarSession;
}): SidebarContextRefresh {
  const { previous, session } = input;

  if (previous === null) {
    return { status: 're-resolve', reasons: ['no-previous-context'] };
  }

  // Checked before everything else: a cached customer never crosses a tenant
  // boundary, however well the remaining fields line up.
  if (previous.tenant.workspaceId !== session.tenant.workspaceId) {
    return { status: 'reset', reason: 'tenant-changed' };
  }

  const readyPrevious = isReadySidebarContext(previous) ? previous : null;
  const reasons: SidebarContextReResolveReason[] = [];

  if (previous.operatorMemberId !== session.operatorMemberId) {
    reasons.push('operator-changed');
  }

  if (
    previous.wecomIdentity.connectionId !==
      session.wecomIdentity.connectionId ||
    previous.wecomIdentity.externalUserId !== session.wecomIdentity.externalUserId
  ) {
    reasons.push('wecom-identity-changed');
  }

  if (readyPrevious === null) {
    return {
      status: 're-resolve',
      reasons: [...reasons, 'previous-context-blocked'],
    };
  }

  if (reasons.length > 0) {
    return { status: 're-resolve', reasons };
  }

  // Reuse keeps the resolved customer and rebinds the session id, so a reopened
  // sidebar reports its own session rather than the one that resolved it.
  return {
    status: 'reuse',
    context: { ...readyPrevious, sessionId: session.sessionId },
  };
}
