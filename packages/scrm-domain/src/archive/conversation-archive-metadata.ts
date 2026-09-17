import { requireIsoTimestamp } from '../wecom/wecom-time';

// Ingestion state of the archive. A conversation whose archive is still
// INGESTING can become usable later, so callers must treat it as pending rather
// than as proof that the evidence does not exist. SUSPENDED is a deliberate
// stop (provider revoked, tenant disabled) and never resolves on its own.
export const CONVERSATION_ARCHIVE_STATES = [
  'INGESTING',
  'READY',
  'SUSPENDED',
] as const;

export type ConversationArchiveState =
  (typeof CONVERSATION_ARCHIVE_STATES)[number];

// How much of the stored content may leave the archive. An archive is never
// implicitly raw: RAW has to be established, and the default posture for
// sensitive tenant data is REDACTED.
export const CONVERSATION_REDACTION_STATES = [
  'RAW',
  'REDACTED',
  'WITHHELD',
] as const;

export type ConversationRedactionState =
  (typeof CONVERSATION_REDACTION_STATES)[number];

// Retention is an obligation towards the counterparty, not a storage detail:
// once the deadline passes the content must stop being readable even while the
// bytes still exist, so EXPIRED and DELETED are both terminal for evidence.
export const CONVERSATION_RETENTION_STATUSES = [
  'RETAINED',
  'EXPIRED',
  'DELETED',
] as const;

export type ConversationRetentionStatus =
  (typeof CONVERSATION_RETENTION_STATUSES)[number];

export type ConversationArchiveMetadata = {
  conversationId: string;
  workspaceId: string;
  connectionId: string;
  // Null when the conversation (e.g. an internal or group chat) is not resolved
  // to a customer. Such a conversation cannot carry customer-level conclusions.
  customerId: string | null;
  // Workspace members who took part. Participation is an access precondition,
  // never a substitute for the workspace boundary.
  participantMemberIds: readonly string[];
  archiveState: ConversationArchiveState;
  redaction: ConversationRedactionState;
  // Highest archived message sequence. A reference beyond it is evidence that
  // has not been ingested yet, which is different from evidence that is gone.
  archivedThroughSequence: number;
  startedAt: string;
  lastMessageAt: string;
  // Deadline through which content stays readable; inclusive.
  retainedUntil: string;
  // Set once the purge ran. Non-null makes retention status DELETED.
  deletedAt: string | null;
};

export function conversationRetentionStatus(
  metadata: Pick<ConversationArchiveMetadata, 'retainedUntil' | 'deletedAt'>,
  at: string,
): ConversationRetentionStatus {
  requireIsoTimestamp(at, 'at');
  requireIsoTimestamp(metadata.retainedUntil, 'retainedUntil');

  // Deletion outranks the retention window: a purge that ran early does not
  // become readable again just because the deadline has not arrived.
  if (metadata.deletedAt !== null) {
    requireIsoTimestamp(metadata.deletedAt, 'deletedAt');

    return 'DELETED';
  }

  return Date.parse(at) > Date.parse(metadata.retainedUntil)
    ? 'EXPIRED'
    : 'RETAINED';
}
