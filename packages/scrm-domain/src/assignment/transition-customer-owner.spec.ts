import { transitionCustomerOwner } from './transition-customer-owner';
import { type CustomerAssignment } from './customer-assignment';

const ACTIVE_ASSIGNMENT: CustomerAssignment = {
  id: 'assignment-1',
  customerId: 'customer-1',
  ownerMemberId: 'member-1',
  startedAt: '2026-09-01T00:00:00.000Z',
  endedAt: null,
  status: 'ACTIVE',
  reason: 'initial assignment',
};

const ATTRIBUTION_SNAPSHOT = {
  ownerMemberId: 'member-2',
  ownerName: '销售乙',
  teamId: 'team-1',
  teamName: '华东一组',
  sourceId: 'source-1',
  sourceName: '官网',
  contactCodeId: 'contact-code-1',
  contactCodeName: '秋季活动码',
};

describe('transitionCustomerOwner', () => {
  it('returns an idempotent result when the owner is unchanged', () => {
    const result = transitionCustomerOwner({
      currentAssignment: ACTIVE_ASSIGNMENT,
      customerId: 'customer-1',
      nextAssignmentId: 'assignment-2',
      assignmentEventId: 'event-1',
      nextOwnerMemberId: 'member-1',
      attributionSnapshot: {
        ...ATTRIBUTION_SNAPSHOT,
        ownerMemberId: 'member-1',
        ownerName: '销售甲',
      },
      changedByMemberId: 'manager-1',
      effectiveAt: '2026-09-10T00:00:00.000Z',
      reason: 'duplicate request',
    });

    expect(result).toEqual({
      changed: false,
      currentAssignment: ACTIVE_ASSIGNMENT,
    });
  });

  it('ends the previous assignment and creates an immutable event snapshot', () => {
    const result = transitionCustomerOwner({
      currentAssignment: ACTIVE_ASSIGNMENT,
      customerId: 'customer-1',
      nextAssignmentId: 'assignment-2',
      assignmentEventId: 'event-1',
      nextOwnerMemberId: 'member-2',
      attributionSnapshot: ATTRIBUTION_SNAPSHOT,
      changedByMemberId: 'manager-1',
      effectiveAt: '2026-09-10T00:00:00.000Z',
      reason: 'team transfer',
    });

    expect(result).toMatchObject({
      changed: true,
      endedAssignment: {
        id: 'assignment-1',
        status: 'ENDED',
        endedAt: '2026-09-10T00:00:00.000Z',
      },
      nextAssignment: {
        id: 'assignment-2',
        ownerMemberId: 'member-2',
        status: 'ACTIVE',
      },
      lifecycleEvent: {
        id: 'event-1',
        type: 'ASSIGNED',
        attributionSnapshot: ATTRIBUTION_SNAPSHOT,
        payload: {
          previousOwnerMemberId: 'member-1',
          reason: 'team transfer',
        },
      },
    });
  });

  it('rejects a transition before the current assignment began', () => {
    expect(() =>
      transitionCustomerOwner({
        currentAssignment: ACTIVE_ASSIGNMENT,
        customerId: 'customer-1',
        nextAssignmentId: 'assignment-2',
        assignmentEventId: 'event-1',
        nextOwnerMemberId: 'member-2',
        attributionSnapshot: ATTRIBUTION_SNAPSHOT,
        changedByMemberId: 'manager-1',
        effectiveAt: '2026-08-31T23:59:59.000Z',
        reason: 'invalid transfer',
      }),
    ).toThrow('effectiveAt cannot precede the current assignment');
  });
});
