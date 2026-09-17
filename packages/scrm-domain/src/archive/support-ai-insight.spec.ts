import { supportAiInsight } from './support-ai-insight';
import { type ConversationReviewContext } from './conversation-access';
import { type ConversationArchiveMetadata } from './conversation-archive-metadata';
import { type ConversationEvidenceReference } from './conversation-evidence';
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

const SALES_OWNER: OperatorContext = {
  memberId: 'member-1',
  role: 'SALES',
  workspaceId: 'workspace-1',
  teamId: 'team-1',
  departmentId: 'department-1',
};

const REVIEW: ConversationReviewContext = {
  operator: SALES_OWNER,
  customerProjection: {
    customerId: 'customer-1',
    context: {
      workspaceId: 'workspace-1',
      currentOwnerMemberId: 'member-1',
      currentOwnerTeamId: 'team-1',
      currentOwnerDepartmentId: 'department-1',
    },
  },
  grants: [],
  at: AT,
};

const REFERENCE: ConversationEvidenceReference = {
  conversationId: 'conversation-1',
  fromSequence: 10,
  toSequence: 14,
};

function resolverFrom(archives: readonly ConversationArchiveMetadata[]) {
  const byConversationId = new Map(
    archives.map((archive) => [archive.conversationId, archive]),
  );

  return (conversationId: string): ConversationArchiveMetadata | null =>
    byConversationId.get(conversationId) ?? null;
}

describe('supportAiInsight', () => {
  it('supports a claim with citations and no archive text', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'NEED_EXTRACTION', text: '客户关注年度采购预算' },
      evidenceReferences: [REFERENCE],
      resolveArchive: resolverFrom([ARCHIVE]),
    });

    // The result shape is the boundary: a supported conclusion carries the
    // claim and its citations, never the conversation content behind them.
    expect(Object.keys(result)).toEqual([
      'status',
      'claim',
      'citations',
      'excerptPolicy',
    ]);
    expect(result).toMatchObject({
      status: 'SUPPORTED',
      excerptPolicy: 'QUOTABLE',
      citations: [
        {
          conversationId: 'conversation-1',
          workspaceId: 'workspace-1',
          fromSequence: 10,
          toSequence: 14,
          accessBasis: 'participant',
          excerptPolicy: 'QUOTABLE',
        },
      ],
    });
  });

  it('refuses a conclusion with no evidence reference', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [],
      resolveArchive: resolverFrom([ARCHIVE]),
    });

    expect(result).toMatchObject({
      status: 'REFUSED',
      reason: 'NO_EVIDENCE',
      rejectedEvidence: [],
    });
  });

  it('refuses a conclusion citing another tenant conversation', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [{ ...REFERENCE, conversationId: 'conversation-2' }],
      resolveArchive: resolverFrom([
        ARCHIVE,
        {
          ...ARCHIVE,
          conversationId: 'conversation-2',
          workspaceId: 'workspace-2',
        },
      ]),
    });

    expect(result).toMatchObject({
      status: 'REFUSED',
      reason: 'CROSS_TENANT',
      rejectedEvidence: [{ reason: 'CROSS_TENANT', retryable: false }],
    });
  });

  it('refuses a conclusion citing purged evidence', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'FOLLOW_UP_PREPARATION', text: '下周需要回访' },
      evidenceReferences: [REFERENCE],
      resolveArchive: resolverFrom([
        { ...ARCHIVE, deletedAt: '2026-09-12T00:00:00.000Z' },
      ]),
    });

    expect(result).toMatchObject({
      status: 'REFUSED',
      reason: 'CONTENT_DELETED',
    });
  });

  it('refuses a conclusion citing evidence past its retention deadline', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'FOLLOW_UP_PREPARATION', text: '下周需要回访' },
      evidenceReferences: [REFERENCE],
      resolveArchive: resolverFrom([
        { ...ARCHIVE, retainedUntil: '2026-09-01T00:00:00.000Z' },
      ]),
    });

    expect(result).toMatchObject({
      status: 'REFUSED',
      reason: 'RETENTION_EXPIRED',
    });
  });

  it('refuses the whole conclusion when one citation is unusable', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [
        REFERENCE,
        {
          conversationId: 'conversation-2',
          fromSequence: 1,
          toSequence: 2,
        },
      ],
      resolveArchive: resolverFrom([
        ARCHIVE,
        {
          ...ARCHIVE,
          conversationId: 'conversation-2',
          workspaceId: 'workspace-2',
        },
      ]),
    });

    // Good evidence next to unusable evidence does not rescue the claim.
    expect(result).toMatchObject({
      status: 'REFUSED',
      reason: 'CROSS_TENANT',
      rejectedEvidence: [{ reason: 'CROSS_TENANT' }],
    });
  });

  it('holds a conclusion pending while every citation is still ingesting', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [
        REFERENCE,
        { conversationId: 'conversation-3', fromSequence: 1, toSequence: 2 },
      ],
      resolveArchive: resolverFrom([
        { ...ARCHIVE, archiveState: 'INGESTING' },
        {
          ...ARCHIVE,
          conversationId: 'conversation-3',
          archivedThroughSequence: 0,
        },
      ]),
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      reason: 'EVIDENCE_NOT_YET_AVAILABLE',
      pendingEvidence: [
        { reason: 'ARCHIVE_NOT_READY', retryable: true },
        { reason: 'SEQUENCE_NOT_ARCHIVED', retryable: true },
      ],
    });
  });

  it('propagates a redaction requirement instead of dropping the claim', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [REFERENCE],
      resolveArchive: resolverFrom([{ ...ARCHIVE, redaction: 'REDACTED' }]),
    });

    expect(result).toMatchObject({
      status: 'SUPPORTED',
      excerptPolicy: 'REDACT_ONLY',
      citations: [{ excerptPolicy: 'REDACT_ONLY' }],
    });
  });

  it('counts the same reference once when it is cited twice', () => {
    const result = supportAiInsight({
      review: REVIEW,
      claim: { kind: 'CUSTOMER_SUMMARY', text: '客户预算充足' },
      evidenceReferences: [REFERENCE, { ...REFERENCE }],
      resolveArchive: resolverFrom([ARCHIVE]),
    });

    expect(result).toMatchObject({
      status: 'SUPPORTED',
      citations: [{ fromSequence: 10, toSequence: 14 }],
    });
  });

  it('rejects a claim without text', () => {
    expect(() =>
      supportAiInsight({
        review: REVIEW,
        claim: { kind: 'CUSTOMER_SUMMARY', text: '   ' },
        evidenceReferences: [REFERENCE],
        resolveArchive: resolverFrom([ARCHIVE]),
      }),
    ).toThrow('claim text is required');
  });
});
