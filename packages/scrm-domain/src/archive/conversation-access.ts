import {
  type CustomerContext,
  type DataScope,
  type OperatorContext,
  PLATFORM_OPERATOR_BUSINESS_DENIAL,
  decideCustomerAccess,
} from '../permissions/customer-access-policy';
import { type ConversationArchiveMetadata } from './conversation-archive-metadata';
import { requireIsoTimestamp } from '../wecom/wecom-time';

// Conversation content is more sensitive than a customer field, so the
// customer scope alone is not enough to read it: a reviewer outside the chat
// also needs an explicit, disclosed, unexpired grant.
export type ConversationAccessGrant = {
  memberId: string;
  workspaceId: string;
  conversationId: string;
  grantedByMemberId: string;
  grantedAt: string;
  // Null means the grant does not expire, but the customer scope still applies.
  expiresAt: string | null;
  // Set only after the counterparty was informed that the conversation may be
  // reviewed. An uninformed grant must not open content.
  disclosureAcknowledgedAt: string | null;
};

// The customer projection the policy decides against, paired with the customer
// it was built for. Carrying the id lets the policy refuse a projection that
// belongs to a different customer instead of silently judging the wrong person.
export type ConversationCustomerProjection = {
  customerId: string;
  context: CustomerContext;
};

export type ConversationReviewContext = {
  operator: OperatorContext;
  // Null when the conversation is not attributed to a customer, or when the
  // caller has not resolved a projection yet.
  customerProjection: ConversationCustomerProjection | null;
  grants: readonly ConversationAccessGrant[];
  at: string;
};

export type ConversationAccessBasis = 'participant' | 'grant';

export type ConversationAccessDecision =
  | {
      allowed: true;
      basis: ConversationAccessBasis;
      scope: DataScope;
    }
  | {
      allowed: false;
      reason: string;
    };

export const CONVERSATION_CROSS_WORKSPACE_DENIAL =
  'conversation belongs to another workspace';

export const CONVERSATION_NOT_ATTRIBUTED_DENIAL =
  'conversation is not attributed to a customer';

export const CONVERSATION_PROJECTION_REQUIRED_DENIAL =
  'customer projection is required to evaluate conversation access';

export const CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL =
  'conversation access requires participation or an active disclosed grant';

export function isConversationGrantActive(
  grant: ConversationAccessGrant,
  operator: OperatorContext,
  conversation: {
    conversationId: string;
    workspaceId: string;
  },
  at: string,
): boolean {
  if (
    grant.memberId !== operator.memberId ||
    grant.workspaceId !== conversation.workspaceId ||
    grant.conversationId !== conversation.conversationId
  ) {
    return false;
  }

  // Disclosure is part of the grant, not a later formality: without it the
  // reviewer is reading content the counterparty was never told about.
  if (grant.disclosureAcknowledgedAt === null) {
    return false;
  }

  requireIsoTimestamp(grant.grantedAt, 'grantedAt');
  requireIsoTimestamp(
    grant.disclosureAcknowledgedAt,
    'disclosureAcknowledgedAt',
  );

  if (grant.expiresAt === null) {
    return true;
  }

  requireIsoTimestamp(grant.expiresAt, 'expiresAt');

  return Date.parse(at) <= Date.parse(grant.expiresAt);
}

export function decideConversationAccess(
  review: ConversationReviewContext,
  conversation: ConversationArchiveMetadata,
): ConversationAccessDecision {
  requireIsoTimestamp(review.at, 'at');

  const { operator } = review;

  if (operator.role === 'PLATFORM_OPERATOR') {
    return { allowed: false, reason: PLATFORM_OPERATOR_BUSINESS_DENIAL };
  }

  // First layer is the workspace boundary, checked before anything else so an
  // operator learns nothing about a conversation outside their tenant.
  if (operator.workspaceId !== conversation.workspaceId) {
    return { allowed: false, reason: CONVERSATION_CROSS_WORKSPACE_DENIAL };
  }

  if (conversation.customerId === null) {
    return { allowed: false, reason: CONVERSATION_NOT_ATTRIBUTED_DENIAL };
  }

  const projection = review.customerProjection;

  if (projection === null) {
    return { allowed: false, reason: CONVERSATION_PROJECTION_REQUIRED_DENIAL };
  }

  // A projection for another customer would evaluate the wrong ownership, so
  // this is a caller defect rather than a denial.
  if (projection.customerId !== conversation.customerId) {
    throw new Error('customer projection belongs to another customer');
  }

  const customerDecision = decideCustomerAccess(operator, projection.context);

  if (!customerDecision.allowed) {
    return {
      allowed: false,
      reason: `customer scope check failed: ${customerDecision.reason}`,
    };
  }

  if (conversation.participantMemberIds.includes(operator.memberId)) {
    return {
      allowed: true,
      basis: 'participant',
      scope: customerDecision.allowedScope,
    };
  }

  const hasActiveGrant = review.grants.some((grant) =>
    isConversationGrantActive(grant, operator, conversation, review.at),
  );

  if (!hasActiveGrant) {
    return {
      allowed: false,
      reason: CONVERSATION_PARTICIPATION_OR_GRANT_REQUIRED_DENIAL,
    };
  }

  return {
    allowed: true,
    basis: 'grant',
    scope: customerDecision.allowedScope,
  };
}
