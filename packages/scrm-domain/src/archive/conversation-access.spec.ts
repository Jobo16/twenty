import {
  CONVERSATION_CROSS_WORKSPACE_DENIAL,
  CONVERSATION_NOT_ATTRIBUTED_DENIAL,
  CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
  CONVERSATION_PROJECTION_REQUIRED_DENIAL,
  type ConversationAccessGrant,
  type ConversationReviewContext,
  decideConversationAccess,
} from './conversation-access';
import { type ConversationArchiveMetadata } from './conversation-archive-metadata';
import { type OperatorContext } from '../permissions/customer-access-policy';

const AT = '2026-09-17T04:00:00.000Z';

const ARCHIVE: ConversationArchiveMetadata = {
  conversationId: 'conversation-1',
  workspaceId: 'workspace-1',
  connectionId: 'connection-1',
  customerId: 'customer-1',
  participantMemberIds: ['member-1'],
  archiveState: 'READY',
  redaction: 'RAW',
  archivedThroughSequence: 40,
  startedAt: '2026-09-01T00:00:00.000Z',
  lastMessageAt: '2026-09-10T00:00:00.000Z',
  retainedUntil: '2027-09-01T00:00:00.000Z',
  deletedAt: null,
};

const CUSTOMER_PROJECTION = {
  customerId: 'customer-1',
  context: {
    workspaceId: 'workspace-1',
    currentOwnerMemberId: 'member-1',
    currentOwnerTeamId: 'team-1',
    currentOwnerDepartmentId: 'department-1',
  },
};

const SALES_OWNER: OperatorContext = {
  memberId: 'member-1',
  role: 'SALES',
  workspaceId: 'workspace-1',
  teamId: 'team-1',
  departmentId: 'department-1',
};

const TENANT_ADMIN: OperatorContext = {
  memberId: 'admin-1',
  role: 'TENANT_ADMIN',
  workspaceId: 'workspace-1',
  teamId: null,
  departmentId: null,
};

function reviewOf(
  operator: OperatorContext,
  grants: readonly ConversationAccessGrant[] = [],
): ConversationReviewContext {
  return { operator, customerProjection: CUSTOMER_PROJECTION, grants, at: AT };
}

function grantOf(
  overrides: Partial<ConversationAccessGrant> = {},
): ConversationAccessGrant {
  return {
    memberId: 'admin-1',
    workspaceId: 'workspace-1',
    conversationId: 'conversation-1',
    grantedByMemberId: 'admin-2',
    grantedAt: '2026-09-15T00:00:00.000Z',
    expiresAt: '2026-10-15T00:00:00.000Z',
    disclosureAcknowledgedAt: '2026-09-15T01:00:00.000Z',
    ...overrides,
  };
}

describe('decideConversationAccess', () => {
  it('allows the sales owner who took part in the conversation', () => {
    expect(decideConversationAccess(reviewOf(SALES_OWNER), ARCHIVE)).toEqual({
      allowed: true,
      basis: 'participant',
      scope: 'OWN',
    });
  });

  it('refuses a platform operator inside the same workspace', () => {
    const decision = decideConversationAccess(
      reviewOf({ ...SALES_OWNER, role: 'PLATFORM_OPERATOR' }),
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: 'PLATFORM_OPERATOR has no access to business customer data',
    });
  });

  it('refuses a conversation that belongs to another workspace', () => {
    const decision = decideConversationAccess(reviewOf(SALES_OWNER), {
      ...ARCHIVE,
      workspaceId: 'workspace-2',
      participantMemberIds: [],
    });

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_CROSS_WORKSPACE_DENIAL,
    });
  });

  it('refuses a conversation that is not attributed to a customer', () => {
    const decision = decideConversationAccess(reviewOf(SALES_OWNER), {
      ...ARCHIVE,
      customerId: null,
    });

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_NOT_ATTRIBUTED_DENIAL,
    });
  });

  it('refuses when no customer projection was resolved', () => {
    const decision = decideConversationAccess(
      { ...reviewOf(SALES_OWNER), customerProjection: null },
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_PROJECTION_REQUIRED_DENIAL,
    });
  });

  it('refuses a reviewer whose customer scope does not cover the customer', () => {
    // A TEAM_LEAD in another team, who nevertheless took part in this
    // conversation: participation is not a substitute for customer scope.
    const decision = decideConversationAccess(
      reviewOf({
        memberId: 'member-1',
        role: 'TEAM_LEAD',
        workspaceId: 'workspace-1',
        teamId: 'team-2',
        departmentId: 'department-1',
      }),
      ARCHIVE,
    );

    expect(decision).toMatchObject({
      allowed: false,
      reason: expect.stringContaining('cannot access this customer'),
    });
  });

  it('refuses a workspace-scoped admin who never took part', () => {
    const decision = decideConversationAccess(reviewOf(TENANT_ADMIN), ARCHIVE);

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
    });
  });

  it('allows a workspace-scoped admin holding a disclosed grant', () => {
    const decision = decideConversationAccess(
      reviewOf(TENANT_ADMIN, [grantOf()]),
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: true,
      basis: 'grant',
      scope: 'WORKSPACE',
    });
  });

  it('refuses an expired grant', () => {
    const decision = decideConversationAccess(
      reviewOf(TENANT_ADMIN, [
        grantOf({ expiresAt: '2026-09-16T00:00:00.000Z' }),
      ]),
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
    });
  });

  it('refuses a grant the counterparty was never told about', () => {
    const decision = decideConversationAccess(
      reviewOf(TENANT_ADMIN, [grantOf({ disclosureAcknowledgedAt: null })]),
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
    });
  });

  it('refuses a grant issued in another workspace', () => {
    const decision = decideConversationAccess(
      reviewOf(TENANT_ADMIN, [grantOf({ workspaceId: 'workspace-2' })]),
      ARCHIVE,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
    });
  });

  it('rejects a projection built for a different customer', () => {
    expect(() =>
      decideConversationAccess(
        {
          ...reviewOf(SALES_OWNER),
          customerProjection: {
            ...CUSTOMER_PROJECTION,
            customerId: 'customer-2',
          },
        },
        ARCHIVE,
      ),
    ).toThrow('customer projection belongs to another customer');
  });
});
