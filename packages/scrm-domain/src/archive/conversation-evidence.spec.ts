import {
  type ConversationReviewContext,
  type ConversationAccessGrant,
} from './conversation-access';
import { type ConversationArchiveMetadata } from './conversation-archive-metadata';
import {
  type ConversationEvidenceReference,
  conversationEvidenceKey,
  evaluateConversationEvidence,
} from './conversation-evidence';
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

const OUTSIDER: OperatorContext = {
  memberId: 'member-9',
  role: 'SALES',
  workspaceId: 'workspace-1',
  teamId: 'team-9',
  departmentId: 'department-9',
};

const REVIEW: ConversationReviewContext = {
  operator: SALES_OWNER,
  customerProjection: CUSTOMER_PROJECTION,
  grants: [] as readonly ConversationAccessGrant[],
  at: AT,
};

const REFERENCE: ConversationEvidenceReference = {
  conversationId: 'conversation-1',
  fromSequence: 10,
  toSequence: 14,
};

function resolveFrom(
  metadata: ConversationArchiveMetadata | null,
): (conversationId: string) => ConversationArchiveMetadata | null {
  return () => metadata;
}

describe('conversationEvidenceKey', () => {
  it('identifies the same message range across callers', () => {
    expect(conversationEvidenceKey(REFERENCE)).toBe(
      conversationEvidenceKey({ ...REFERENCE }),
    );
  });

  it('rejects a reversed sequence range', () => {
    expect(() =>
      conversationEvidenceKey({ ...REFERENCE, fromSequence: 20 }),
    ).toThrow('sequence range must be a positive, ordered range');
  });
});

describe('evaluateConversationEvidence', () => {
  it('cites an authorized conversation and marks raw text quotable', () => {
    expect(
      evaluateConversationEvidence(REVIEW, REFERENCE, resolveFrom(ARCHIVE)),
    ).toEqual({
      status: 'USABLE',
      reference: REFERENCE,
      citation: {
        conversationId: 'conversation-1',
        workspaceId: 'workspace-1',
        fromSequence: 10,
        toSequence: 14,
        accessBasis: 'participant',
        excerptPolicy: 'QUOTABLE',
      },
    });
  });

  it('keeps a redacted archive usable but not quotable', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, redaction: 'REDACTED' }),
    );

    expect(verdict).toMatchObject({
      status: 'USABLE',
      citation: { excerptPolicy: 'REDACT_ONLY' },
    });
  });

  it('refuses evidence stored in another workspace', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, workspaceId: 'workspace-2' }),
    );

    expect(verdict).toEqual({
      status: 'UNAVAILABLE',
      reference: REFERENCE,
      reason: 'CROSS_TENANT',
      detail: 'evidence conversation belongs to another workspace',
      retryable: false,
    });
  });

  it('treats an unknown conversation as permanently unavailable', () => {
    expect(
      evaluateConversationEvidence(REVIEW, REFERENCE, resolveFrom(null)),
    ).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'CONVERSATION_NOT_FOUND',
    });
  });

  it('rejects a reference that is not a positive ordered range', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      { ...REFERENCE, fromSequence: 0 },
      resolveFrom(ARCHIVE),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'INVALID_SEQUENCE_RANGE',
      retryable: false,
    });
  });

  it('refuses evidence the operator may not read', () => {
    const verdict = evaluateConversationEvidence(
      { ...REVIEW, operator: OUTSIDER },
      REFERENCE,
      resolveFrom(ARCHIVE),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'ACCESS_DENIED',
      retryable: false,
    });
  });

  it('reports denial rather than retention for an unauthorized operator', () => {
    const verdict = evaluateConversationEvidence(
      { ...REVIEW, operator: OUTSIDER },
      REFERENCE,
      resolveFrom({
        ...ARCHIVE,
        retainedUntil: '2026-01-01T00:00:00.000Z',
      }),
    );

    // Access is decided before content state, so an operator without access
    // learns nothing about whether the content expired.
    expect(verdict).toMatchObject({ reason: 'ACCESS_DENIED' });
  });

  it('refuses purged content', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, deletedAt: '2026-09-12T00:00:00.000Z' }),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'CONTENT_DELETED',
      retryable: false,
    });
  });

  it('refuses content past its retention deadline', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, retainedUntil: '2026-09-01T00:00:00.000Z' }),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'RETENTION_EXPIRED',
      retryable: false,
    });
  });

  it('refuses withheld content even while it is retained', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, redaction: 'WITHHELD' }),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'CONTENT_WITHHELD',
      retryable: false,
    });
  });

  it('treats a suspended archive as permanently unavailable', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, archiveState: 'SUSPENDED' }),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'ARCHIVE_SUSPENDED',
      retryable: false,
    });
  });

  it('treats a still ingesting archive as retryable', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      REFERENCE,
      resolveFrom({ ...ARCHIVE, archiveState: 'INGESTING' }),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'ARCHIVE_NOT_READY',
      retryable: true,
    });
  });

  it('treats messages beyond the archived sequence as retryable', () => {
    const verdict = evaluateConversationEvidence(
      REVIEW,
      { ...REFERENCE, toSequence: 41 },
      resolveFrom(ARCHIVE),
    );

    expect(verdict).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'SEQUENCE_NOT_ARCHIVED',
      retryable: true,
    });
  });
});
