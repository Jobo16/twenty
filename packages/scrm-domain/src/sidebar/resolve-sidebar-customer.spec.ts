import {
  resolveSidebarCustomer,
  type SidebarCustomerLookup,
} from './resolve-sidebar-customer';

const LOOKUP: SidebarCustomerLookup = {
  tenant: { workspaceId: 'workspace-1' },
  identity: { connectionId: 'connection-1', externalUserId: 'external-1' },
  matchedCustomerIds: ['customer-1'],
  crossTenantWorkspaceId: null,
  resolvedAt: '2026-09-17T02:00:00.000Z',
};

describe('resolveSidebarCustomer', () => {
  it('resolves the single customer that owns the external identity', () => {
    const resolution = resolveSidebarCustomer(LOOKUP);

    expect(resolution).toMatchObject({
      status: 'resolved',
      customerId: 'customer-1',
    });
  });

  it('reports an unknown chat instead of guessing a customer', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      matchedCustomerIds: [],
    });

    expect(resolution).toMatchObject({
      status: 'unresolved',
      reason: 'identity-not-found',
    });
  });

  it('refuses an identity claimed by more than one customer', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      matchedCustomerIds: ['customer-1', 'customer-2'],
    });

    expect(resolution).toMatchObject({
      status: 'conflict',
      reason: 'identity-matches-multiple-customers',
    });
  });

  it('collapses a repeated match on the same customer', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      matchedCustomerIds: ['customer-1', 'customer-1'],
    });

    expect(resolution).toMatchObject({
      status: 'resolved',
      customerId: 'customer-1',
    });
  });

  it('refuses an identity another workspace already owns, even with a local match', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      crossTenantWorkspaceId: 'workspace-2',
    });

    expect(resolution).toMatchObject({
      status: 'conflict',
      reason: 'cross-tenant-identity',
    });
  });

  it('keeps a local match when the cross-tenant label is its own workspace', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      crossTenantWorkspaceId: 'workspace-1',
    });

    expect(resolution).toMatchObject({
      status: 'resolved',
      customerId: 'customer-1',
    });
  });

  it('scopes the identity key to its WeCom connection', () => {
    const first = resolveSidebarCustomer(LOOKUP);
    const second = resolveSidebarCustomer({
      ...LOOKUP,
      identity: { connectionId: 'connection-2', externalUserId: 'external-1' },
    });

    expect(first.identityKey).not.toBe(second.identityKey);
  });

  it('ignores blank customer ids rather than resolving an empty customer', () => {
    const resolution = resolveSidebarCustomer({
      ...LOOKUP,
      matchedCustomerIds: ['  '],
    });

    expect(resolution).toMatchObject({
      status: 'unresolved',
      reason: 'identity-not-found',
    });
  });
});
