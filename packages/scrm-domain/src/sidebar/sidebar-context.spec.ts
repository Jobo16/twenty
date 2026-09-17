import {
  buildSidebarContext,
  isReadySidebarContext,
  refreshSidebarContext,
  type ReadySidebarContext,
  type SidebarContext,
} from './sidebar-context';
import type { SidebarCustomerResolution } from './resolve-sidebar-customer';
import type { SidebarSession } from './sidebar-session';

const SESSION: SidebarSession = {
  sessionId: 'session-1',
  tenant: { workspaceId: 'workspace-1' },
  operatorMemberId: 'member-1',
  wecomIdentity: { connectionId: 'connection-1', externalUserId: 'external-1' },
  openedAt: '2026-09-17T02:00:00.000Z',
};

const RESOLVED: SidebarCustomerResolution = {
  status: 'resolved',
  identityKey: 'identity-1',
  customerId: 'customer-1',
  resolvedAt: '2026-09-17T02:00:01.000Z',
};

const UNRESOLVED: SidebarCustomerResolution = {
  status: 'unresolved',
  reason: 'identity-not-found',
  identityKey: 'identity-1',
  resolvedAt: '2026-09-17T02:00:01.000Z',
};

const requireReady = (context: SidebarContext): ReadySidebarContext => {
  if (!isReadySidebarContext(context)) {
    throw new Error(`expected a ready context, got ${context.status}`);
  }

  return context;
};

const READY_CONTEXT = requireReady(buildSidebarContext(SESSION, RESOLVED));
const BLOCKED_CONTEXT = buildSidebarContext(SESSION, UNRESOLVED);

describe('buildSidebarContext', () => {
  it('binds the resolved customer to tenant, operator and identity', () => {
    const context = requireReady(buildSidebarContext(SESSION, RESOLVED));

    expect(context.customerId).toBe('customer-1');
    expect(context.operatorMemberId).toBe('member-1');
    expect(context.tenant).toEqual({ workspaceId: 'workspace-1' });
    expect(context.wecomIdentity).toEqual({
      connectionId: 'connection-1',
      externalUserId: 'external-1',
    });
  });

  it('blocks the context when the chat has no customer', () => {
    expect(BLOCKED_CONTEXT).toMatchObject({
      status: 'blocked',
      reason: 'identity-not-found',
    });
  });

  it('exposes no customer id on a blocked context', () => {
    expect('customerId' in BLOCKED_CONTEXT).toBe(false);
  });
});

describe('refreshSidebarContext', () => {
  it('requires a first resolution when there is no previous context', () => {
    const refresh = refreshSidebarContext({
      previous: null,
      session: SESSION,
    });

    expect(refresh).toEqual({
      status: 're-resolve',
      reasons: ['no-previous-context'],
    });
  });

  it('reuses the resolved customer when the same operator reopens the sidebar', () => {
    const refresh = refreshSidebarContext({
      previous: READY_CONTEXT,
      session: { ...SESSION, sessionId: 'session-2' },
    });

    expect(refresh).toMatchObject({
      status: 'reuse',
      context: { sessionId: 'session-2', customerId: 'customer-1' },
    });
  });

  it('requires a fresh resolution when the operator switches', () => {
    const refresh = refreshSidebarContext({
      previous: READY_CONTEXT,
      session: { ...SESSION, operatorMemberId: 'member-2' },
    });

    expect(refresh).toEqual({
      status: 're-resolve',
      reasons: ['operator-changed'],
    });
  });

  it('requires a fresh resolution when the chat identity changes', () => {
    const refresh = refreshSidebarContext({
      previous: READY_CONTEXT,
      session: {
        ...SESSION,
        wecomIdentity: {
          connectionId: 'connection-1',
          externalUserId: 'external-2',
        },
      },
    });

    expect(refresh).toEqual({
      status: 're-resolve',
      reasons: ['wecom-identity-changed'],
    });
  });

  it('reports every reason the previous context is unusable', () => {
    const refresh = refreshSidebarContext({
      previous: READY_CONTEXT,
      session: {
        ...SESSION,
        operatorMemberId: 'member-2',
        wecomIdentity: {
          connectionId: 'connection-1',
          externalUserId: 'external-2',
        },
      },
    });

    expect(refresh).toEqual({
      status: 're-resolve',
      reasons: ['operator-changed', 'wecom-identity-changed'],
    });
  });

  it('never carries a cached customer across a tenant boundary', () => {
    const refresh = refreshSidebarContext({
      previous: READY_CONTEXT,
      session: { ...SESSION, tenant: { workspaceId: 'workspace-2' } },
    });

    expect(refresh).toEqual({ status: 'reset', reason: 'tenant-changed' });
  });

  it('does not reuse a blocked context as if it had a customer', () => {
    const refresh = refreshSidebarContext({
      previous: BLOCKED_CONTEXT,
      session: SESSION,
    });

    expect(refresh).toEqual({
      status: 're-resolve',
      reasons: ['previous-context-blocked'],
    });
  });
});
