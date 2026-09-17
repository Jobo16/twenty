import {
  openSidebarSession,
  type OpenSidebarSessionInput,
  type OpenSidebarSessionOutcome,
  type SidebarSession,
} from './sidebar-session';

const OPEN_INPUT: OpenSidebarSessionInput = {
  sessionId: 'session-1',
  tenant: { workspaceId: 'workspace-1' },
  operatorMemberId: 'member-1',
  connectionId: 'connection-1',
  externalUserId: 'external-1',
  openedAt: '2026-09-17T02:00:00.000Z',
};

const requireSession = (outcome: OpenSidebarSessionOutcome): SidebarSession => {
  if (outcome.status !== 'opened') {
    throw new Error(`expected an opened session, got ${outcome.status}`);
  }

  return outcome.session;
};

describe('openSidebarSession', () => {
  it('binds tenant, operator and the WeCom identity of the open chat', () => {
    const session = requireSession(openSidebarSession(OPEN_INPUT));

    expect(session.tenant).toEqual({ workspaceId: 'workspace-1' });
    expect(session.operatorMemberId).toBe('member-1');
    expect(session.wecomIdentity).toEqual({
      connectionId: 'connection-1',
      externalUserId: 'external-1',
    });
  });

  it('refuses a session whose chat was never identified', () => {
    const outcome = openSidebarSession({
      ...OPEN_INPUT,
      connectionId: null,
      externalUserId: null,
    });

    expect(outcome).toEqual({
      status: 'incomplete',
      missing: ['wecomIdentity'],
    });
  });

  it('refuses a session with no operator', () => {
    const outcome = openSidebarSession({
      ...OPEN_INPUT,
      operatorMemberId: '   ',
    });

    expect(outcome).toEqual({
      status: 'incomplete',
      missing: ['operatorMemberId'],
    });
  });

  it('reports every missing binding at once', () => {
    const outcome = openSidebarSession({
      ...OPEN_INPUT,
      sessionId: '',
      operatorMemberId: '',
      externalUserId: '',
    });

    expect(outcome).toEqual({
      status: 'incomplete',
      missing: ['sessionId', 'operatorMemberId', 'wecomIdentity'],
    });
  });

  it('rejects a blank workspace instead of defaulting a tenant', () => {
    expect(() =>
      openSidebarSession({ ...OPEN_INPUT, tenant: { workspaceId: '  ' } }),
    ).toThrow('workspaceId is required');
  });
});
