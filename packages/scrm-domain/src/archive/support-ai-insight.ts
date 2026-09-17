import { type AiInsightClaim, type AiInsightResult } from './ai-insight';
import {
  type ConversationEvidenceCitation,
  type ConversationEvidenceReference,
  type ConversationEvidenceUnavailable,
  type ResolveConversationArchive,
  conversationEvidenceKey,
  evaluateConversationEvidence,
} from './conversation-evidence';
import { type ConversationReviewContext } from './conversation-access';

export type SupportAiInsightInput = {
  review: ConversationReviewContext;
  claim: AiInsightClaim;
  evidenceReferences: readonly ConversationEvidenceReference[];
  resolveArchive: ResolveConversationArchive;
};

function describeRejected(
  rejected: readonly ConversationEvidenceUnavailable[],
): string {
  const reasons = [...new Set(rejected.map((evidence) => evidence.reason))];

  return `conclusion cites unusable evidence: ${reasons.join(', ')}`;
}

export function supportAiInsight(
  input: SupportAiInsightInput,
): AiInsightResult {
  const { claim } = input;

  // An empty claim is a caller defect rather than a domain outcome: there is
  // nothing to support or to refuse.
  if (claim.text.trim().length === 0) {
    throw new Error('claim text is required');
  }

  const evidenceReferences = input.evidenceReferences;

  // A conclusion without evidence is refused instead of downgraded, so a
  // missing citation can never be mistaken for a weak one.
  if (evidenceReferences.length === 0) {
    return {
      status: 'REFUSED',
      claim,
      reason: 'NO_EVIDENCE',
      detail: 'conclusion must cite at least one evidence reference',
      rejectedEvidence: [],
    };
  }

  const citations: ConversationEvidenceCitation[] = [];
  const citedKeys = new Set<string>();
  const unusable: ConversationEvidenceUnavailable[] = [];

  for (const reference of evidenceReferences) {
    const verdict = evaluateConversationEvidence(
      input.review,
      reference,
      input.resolveArchive,
    );

    // Every reference is evaluated, including a malformed one, so an invalid
    // range is reported as a refusal reason rather than thrown from here.
    if (verdict.status !== 'USABLE') {
      unusable.push(verdict);

      continue;
    }

    // The same message range cited twice is one piece of evidence.
    const key = conversationEvidenceKey(verdict.citation);

    if (!citedKeys.has(key)) {
      citedKeys.add(key);
      citations.push(verdict.citation);
    }
  }

  const rejected = unusable.filter((evidence) => !evidence.retryable);

  // One permanently unusable citation refuses the whole conclusion: a claim
  // resting partly on expired, deleted or foreign content is not supported by
  // the remaining citations, however good they are.
  if (rejected.length > 0) {
    return {
      status: 'REFUSED',
      claim,
      reason: rejected[0].reason,
      detail: describeRejected(rejected),
      rejectedEvidence: rejected,
    };
  }

  if (unusable.length > 0) {
    return {
      status: 'PENDING',
      claim,
      reason: 'EVIDENCE_NOT_YET_AVAILABLE',
      detail:
        'citations are still ingesting; retry after the archive catches up',
      pendingEvidence: unusable,
    };
  }

  const hasRedactOnlyCitation = citations.some(
    (citation) => citation.excerptPolicy === 'REDACT_ONLY',
  );

  return {
    status: 'SUPPORTED',
    claim,
    citations,
    excerptPolicy: hasRedactOnlyCitation ? 'REDACT_ONLY' : 'QUOTABLE',
  };
}
