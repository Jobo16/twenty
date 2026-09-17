import { type CustomerAssignment } from './customer-assignment';
import {
  type CustomerAttributionSnapshot,
  type CustomerLifecycleEvent,
} from '../lifecycle/customer-lifecycle-event';

export type TransitionCustomerOwnerInput = {
  currentAssignment: CustomerAssignment | null;
  customerId: string;
  nextAssignmentId: string;
  assignmentEventId: string;
  nextOwnerMemberId: string;
  attributionSnapshot: CustomerAttributionSnapshot;
  changedByMemberId: string;
  effectiveAt: string;
  reason: string;
};

export type CustomerOwnerTransition =
  | {
      changed: false;
      currentAssignment: CustomerAssignment;
    }
  | {
      changed: true;
      endedAssignment: CustomerAssignment | null;
      nextAssignment: CustomerAssignment;
      lifecycleEvent: CustomerLifecycleEvent;
    };

function requireIsoTimestamp(value: string, fieldName: string): number {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`${fieldName} must be an ISO timestamp`);
  }

  return timestamp;
}

export function transitionCustomerOwner(
  input: TransitionCustomerOwnerInput,
): CustomerOwnerTransition {
  const effectiveTimestamp = requireIsoTimestamp(
    input.effectiveAt,
    'effectiveAt',
  );
  const currentAssignment = input.currentAssignment;

  if (currentAssignment !== null) {
    if (currentAssignment.customerId !== input.customerId) {
      throw new Error('current assignment belongs to another customer');
    }

    if (
      currentAssignment.status !== 'ACTIVE' ||
      currentAssignment.endedAt !== null
    ) {
      throw new Error('current assignment must be active');
    }

    if (
      effectiveTimestamp <
      requireIsoTimestamp(currentAssignment.startedAt, 'startedAt')
    ) {
      throw new Error('effectiveAt cannot precede the current assignment');
    }

    if (currentAssignment.ownerMemberId === input.nextOwnerMemberId) {
      return { changed: false, currentAssignment };
    }
  }

  if (input.attributionSnapshot.ownerMemberId !== input.nextOwnerMemberId) {
    throw new Error('attribution owner must match the next owner');
  }

  const endedAssignment = currentAssignment
    ? {
        ...currentAssignment,
        endedAt: input.effectiveAt,
        status: 'ENDED' as const,
      }
    : null;

  const nextAssignment: CustomerAssignment = {
    id: input.nextAssignmentId,
    customerId: input.customerId,
    ownerMemberId: input.nextOwnerMemberId,
    startedAt: input.effectiveAt,
    endedAt: null,
    status: 'ACTIVE',
    reason: input.reason,
  };

  return {
    changed: true,
    endedAssignment,
    nextAssignment,
    lifecycleEvent: {
      id: input.assignmentEventId,
      customerId: input.customerId,
      type: 'ASSIGNED',
      occurredAt: input.effectiveAt,
      actorMemberId: input.changedByMemberId,
      attributionSnapshot: input.attributionSnapshot,
      payload: {
        previousOwnerMemberId: currentAssignment?.ownerMemberId ?? null,
        reason: input.reason,
      },
    },
  };
}
