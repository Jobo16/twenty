import {
  type ConversationEvidenceCitation,
  type ConversationEvidenceUnavailable,
  type ConversationEvidenceUnavailableReason,
  type ConversationExcerptPolicy,
} from './conversation-evidence';

export const AI_INSIGHT_CLAIM_KINDS = [
  'CUSTOMER_SUMMARY',
  'NEED_EXTRACTION',
  'FOLLOW_UP_PREPARATION',
] as const;

export type AiInsightClaimKind = (typeof AI_INSIGHT_CLAIM_KINDS)[number];

export type AiInsightClaim = {
  kind: AiInsightClaimKind;
  // The proposition the model wants a salesperson to act on. The domain keeps
  // the claim and its citations; it never keeps the archive text behind them.
  text: string;
};

// A refusal reuses the evidence vocabulary: the reason a conclusion is refused
// is always a reason one of its citations could not be used.
export type AiInsightRefusalReason =
  | 'NO_EVIDENCE'
  | ConversationEvidenceUnavailableReason;

export const AI_INSIGHT_PENDING_REASONS = [
  'EVIDENCE_NOT_YET_AVAILABLE',
] as const;

export type AiInsightPendingReason =
  (typeof AI_INSIGHT_PENDING_REASONS)[number];

export type AiInsightResult =
  | {
      status: 'SUPPORTED';
      claim: AiInsightClaim;
      citations: readonly ConversationEvidenceCitation[];
      // REDACT_ONLY means the claim stands but its messages may not be quoted.
      excerptPolicy: ConversationExcerptPolicy;
    }
  | {
      status: 'REFUSED';
      claim: AiInsightClaim;
      reason: AiInsightRefusalReason;
      detail: string;
      rejectedEvidence: readonly ConversationEvidenceUnavailable[];
    }
  | {
      status: 'PENDING';
      claim: AiInsightClaim;
      reason: AiInsightPendingReason;
      detail: string;
      pendingEvidence: readonly ConversationEvidenceUnavailable[];
    };
