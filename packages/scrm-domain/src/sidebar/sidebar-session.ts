import {
  requireTenantContext,
  type TenantContext,
} from '../tenant/tenant-context';
import { requireIsoTimestamp } from '../wecom/wecom-time';

// The WeCom chat the sidebar is opened in. Both parts are needed: the same
// external_userid means different people under different connections.
export type SidebarWecomIdentity = {
  connectionId: string;
  externalUserId: string;
};

export type SidebarSessionMissingField =
  | 'sessionId'
  | 'operatorMemberId'
  | 'wecomIdentity';

export type SidebarSession = {
  sessionId: string;
  tenant: TenantContext;
  operatorMemberId: string;
  wecomIdentity: SidebarWecomIdentity;
  openedAt: string;
};

// The raw open event. connectionId/externalUserId are nullable because the
// sidebar can open before the host has identified the chat.
export type OpenSidebarSessionInput = {
  sessionId: string;
  tenant: TenantContext;
  operatorMemberId: string;
  connectionId: string | null;
  externalUserId: string | null;
  openedAt: string;
};

export type OpenSidebarSessionOutcome =
  | { status: 'opened'; session: SidebarSession }
  | { status: 'incomplete'; missing: SidebarSessionMissingField[] };

const isBlank = (value: string): boolean => value.trim().length === 0;

const resolveWecomIdentity = (
  connectionId: string | null,
  externalUserId: string | null,
): SidebarWecomIdentity | null => {
  if (connectionId === null || externalUserId === null) {
    return null;
  }

  if (isBlank(connectionId) || isBlank(externalUserId)) {
    return null;
  }

  return { connectionId, externalUserId };
};

// A session is only usable when tenant, operator and WeCom identity are all
// present. A partially identified session is reported instead of defaulted,
// because any default would later be written to a customer we never resolved.
export function openSidebarSession(
  input: OpenSidebarSessionInput,
): OpenSidebarSessionOutcome {
  // The tenant comes from the authenticated server context; a missing one is a
  // server defect, not a user-recoverable state, so it throws.
  const tenant = requireTenantContext(input.tenant);
  const openedAt = requireIsoTimestamp(input.openedAt, 'openedAt');

  const missing: SidebarSessionMissingField[] = [];

  if (isBlank(input.sessionId)) {
    missing.push('sessionId');
  }

  if (isBlank(input.operatorMemberId)) {
    missing.push('operatorMemberId');
  }

  const wecomIdentity = resolveWecomIdentity(
    input.connectionId,
    input.externalUserId,
  );

  if (wecomIdentity === null) {
    return { status: 'incomplete', missing: [...missing, 'wecomIdentity'] };
  }

  if (missing.length > 0) {
    return { status: 'incomplete', missing };
  }

  return {
    status: 'opened',
    session: {
      sessionId: input.sessionId,
      tenant,
      operatorMemberId: input.operatorMemberId,
      wecomIdentity,
      openedAt,
    },
  };
}
