import {
  type ConversationAccessBasis,
  type ConversationReviewContext,
  decideConversationAccess,
} from './conversation-access';
import {
  type ConversationArchiveMetadata,
  conversationRetentionStatus,
} from './conversation-archive-metadata';

// A conclusion never stores conversation text, only a pointer back into the
// archive. The reference is the whole of what "why does this conclusion exist"
// means in the domain, so it has to be replayable and tenant-scoped.
export type ConversationEvidenceReference = {
  conversationId: string;
  // Inclusive sequence range, so a reviewer can replay exactly the messages the
  // conclusion rests on rather than the whole conversation.
  fromSequence: number;
  toSequence: number;
};

export function conversationEvidenceKey(
  reference: ConversationEvidenceReference,
): string {
  requireConversationEvidenceRange(reference);

  return JSON.stringify([
    reference.conversationId,
    reference.fromSequence,
    reference.toSequence,
  ]);
}

export function requireConversationEvidenceRange(
  reference: ConversationEvidenceReference,
): ConversationEvidenceReference {
  if (reference.conversationId.trim().length === 0) {
    throw new Error('conversationId is required');
  }

  if (
    !Number.isInteger(reference.fromSequence) ||
    !Number.isInteger(reference.toSequence) ||
    reference.fromSequence < 1 ||
    reference.toSequence < reference.fromSequence
  ) {
    throw new Error('sequence range must be a positive, ordered range');
  }

  return reference;
}

export function isConversationEvidenceRangeValid(
  reference: ConversationEvidenceReference,
): boolean {
  return (
    reference.conversationId.trim().length > 0 &&
    Number.isInteger(reference.fromSequence) &&
    Number.isInteger(reference.toSequence) &&
    reference.fromSequence >= 1 &&
    reference.toSequence >= reference.fromSequence
  );
}

// Whether the messages behind a citation may be shown verbatim. REDACT_ONLY
// still supports a conclusion; it only forbids reproducing the text.
export const CONVERSATION_EXCERPT_POLICIES = [
  'QUOTABLE',
  'REDACT_ONLY',
] as const;

export type ConversationExcerptPolicy =
  (typeof CONVERSATION_EXCERPT_POLICIES)[number];

// The minimum a reviewer needs to re-derive the conclusion: which tenant, which
// conversation, which messages, and the access precondition that was met.
export type ConversationEvidenceCitation = {
  conversationId: string;
  workspaceId: string;
  fromSequence: number;
  toSequence: number;
  accessBasis: ConversationAccessBasis;
  excerptPolicy: ConversationExcerptPolicy;
};

export const CONVERSATION_EVIDENCE_UNAVAILABLE_REASONS = [
  'INVALID_SEQUENCE_RANGE',
  'CONVERSATION_NOT_FOUND',
  'CROSS_TENANT',
  'ACCESS_DENIED',
  'CONTENT_DELETED',
  'RETENTION_EXPIRED',
  'CONTENT_WITHHELD',
  'ARCHIVE_SUSPENDED',
  'ARCHIVE_NOT_READY',
  'SEQUENCE_NOT_ARCHIVED',
] as const;

export type ConversationEvidenceUnavailableReason =
  (typeof CONVERSATION_EVIDENCE_UNAVAILABLE_REASONS)[number];

// Retryable means the archive may still answer the same reference later. It is
// the difference between "this conclusion can never be supported" and "not yet",
// so it is an explicit allow-list rather than a default.
const RETRYABLE_REASONS: ReadonlySet<ConversationEvidenceUnavailableReason> =
  new Set(['ARCHIVE_NOT_READY', 'SEQUENCE_NOT_ARCHIVED']);

export type ConversationEvidenceUnavailable = {
  status: 'UNAVAILABLE';
  reference: ConversationEvidenceReference;
  reason: ConversationEvidenceUnavailableReason;
  detail: string;
  retryable: boolean;
};

export type ConversationEvidenceVerdict =
  | {
      status: 'USABLE';
      reference: ConversationEvidenceReference;
      citation: ConversationEvidenceCitation;
    }
  | ConversationEvidenceUnavailable;

export type ResolveConversationArchive = (
  conversationId: string,
) => ConversationArchiveMetadata | null;

function unavailable(
  reference: ConversationEvidenceReference,
  reason: ConversationEvidenceUnavailableReason,
  detail: string,
): ConversationEvidenceUnavailable {
  return {
    status: 'UNAVAILABLE',
    reference,
    reason,
    detail,
    retryable: RETRYABLE_REASONS.has(reason),
  };
}

export function evaluateConversationEvidence(
  review: ConversationReviewContext,
  reference: ConversationEvidenceReference,
  resolveArchive: ResolveConversationArchive,
): ConversationEvidenceVerdict {
  if (!isConversationEvidenceRangeValid(reference)) {
    return unavailable(
      reference,
      'INVALID_SEQUENCE_RANGE',
      'evidence must name a conversation and a positive, ordered sequence range',
    );
  }

  const archive = resolveArchive(reference.conversationId);

  if (archive === null) {
    return unavailable(
      reference,
      'CONVERSATION_NOT_FOUND',
      'no archive is known for this conversation',
    );
  }

  // Tenant isolation is decided on the stored metadata, before any access or
  // retention reasoning, so a foreign conversation is never inspected further.
  if (archive.workspaceId !== review.operator.workspaceId) {
    return unavailable(
      reference,
      'CROSS_TENANT',
      'evidence conversation belongs to another workspace',
    );
  }

  // Access is checked before retention and archive state so that an operator
  // without access cannot learn whether content existed, expired or is still
  // ingesting. Everything below is a fact about content they may already read.
  const access = decideConversationAccess(review, archive);

  if (!access.allowed) {
    return unavailable(reference, 'ACCESS_DENIED', access.reason);
  }

  const retention = conversationRetentionStatus(archive, review.at);

  if (retention === 'DELETED') {
    return unavailable(
      reference,
      'CONTENT_DELETED',
      'archived content was purged and cannot support a conclusion',
    );
  }

  if (retention === 'EXPIRED') {
    return unavailable(
      reference,
      'RETENTION_EXPIRED',
      'retention deadline passed; content is no longer readable',
    );
  }

  // WITHHELD removes the content itself, so it is terminal rather than a
  // formatting instruction like REDACTED.
  if (archive.redaction === 'WITHHELD') {
    return unavailable(
      reference,
      'CONTENT_WITHHELD',
      'content is withheld from every reader',
    );
  }

  if (archive.archiveState === 'SUSPENDED') {
    return unavailable(
      reference,
      'ARCHIVE_SUSPENDED',
      'archive ingestion was suspended and will not resume on its own',
    );
  }

  if (archive.archiveState === 'INGESTING') {
    return unavailable(
      reference,
      'ARCHIVE_NOT_READY',
      'archive has not finished ingesting this conversation',
    );
  }

  if (reference.toSequence > archive.archivedThroughSequence) {
    return unavailable(
      reference,
      'SEQUENCE_NOT_ARCHIVED',
      'referenced messages are beyond the archived sequence',
    );
  }

  return {
    status: 'USABLE',
    reference,
    citation: {
      conversationId: archive.conversationId,
      workspaceId: archive.workspaceId,
      fromSequence: reference.fromSequence,
      toSequence: reference.toSequence,
      accessBasis: access.basis,
      excerptPolicy: archive.redaction === 'RAW' ? 'QUOTABLE' : 'REDACT_ONLY',
    },
  };
}
