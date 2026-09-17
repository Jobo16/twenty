import {
  decideSidebarTaskTrigger,
  type SalesTaskTriggerDecision,
} from './decide-sidebar-task-trigger';
import type {
  BlockedSidebarContext,
  ReadySidebarContext,
} from './sidebar-context';
import type {
  SalesTaskTriggerRecord,
  SalesTaskTriggerRequest,
} from './sales-task-trigger';

const DECIDED_AT = '2026-09-17T04:00:01.000Z';

const readyContext = (
  workspaceId: string,
  customerId: string,
): ReadySidebarContext => ({
  status: 'ready',
  sessionId: 'session-1',
  tenant: { workspaceId },
  operatorMemberId: 'member-1',
  wecomIdentity: { connectionId: 'connection-1', externalUserId: 'external-1' },
  identityKey: 'identity-1',
  customerId,
  resolvedAt: '2026-09-17T02:00:01.000Z',
});

const blockedContext = (): BlockedSidebarContext => ({
  status: 'blocked',
  sessionId: 'session-1',
  tenant: { workspaceId: 'workspace-1' },
  operatorMemberId: 'member-1',
  wecomIdentity: { connectionId: 'connection-1', externalUserId: 'external-1' },
  identityKey: 'identity-1',
  reason: 'identity-not-found',
  resolvedAt: '2026-09-17T02:00:01.000Z',
});

const REQUEST: SalesTaskTriggerRequest = {
  customerId: 'customer-1',
  triggerKind: 'FIRST_CONTACT',
  conditionKey: 'first-contact:customer-1',
  occurredAt: '2026-09-17T04:00:00.000Z',
};

const READY = readyContext('workspace-1', 'customer-1');

const requireCreate = (
  decision: SalesTaskTriggerDecision,
): Extract<SalesTaskTriggerDecision, { status: 'create' }> => {
  if (decision.status !== 'create') {
    throw new Error(`expected a create decision, got ${decision.reason}`);
  }

  return decision;
};

describe('decideSidebarTaskTrigger', () => {
  it('creates a task decision traceable to tenant, operator and customer', () => {
    const decision = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );

    expect(decision.context.tenant).toEqual({ workspaceId: 'workspace-1' });
    expect(decision.context.operatorMemberId).toBe('member-1');
    expect(decision.context.customerId).toBe('customer-1');
    expect(decision.request).toEqual(REQUEST);
  });

  it('does not create a second task for the same condition occurrence', () => {
    const first = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );
    const openTask: SalesTaskTriggerRecord[] = [
      {
        idempotencyKey: first.idempotencyKey,
        taskId: 'task-1',
        taskStatus: 'PENDING',
      },
    ];

    const second = decideSidebarTaskTrigger(
      READY,
      REQUEST,
      openTask,
      DECIDED_AT,
    );

    expect(second).toMatchObject({
      status: 'no-op',
      reason: 'task-already-active',
      existingTaskId: 'task-1',
    });
  });

  it('treats a closed task as having already handled the condition', () => {
    const first = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );
    const closedTask: SalesTaskTriggerRecord[] = [
      {
        idempotencyKey: first.idempotencyKey,
        taskId: 'task-1',
        taskStatus: 'COMPLETED',
      },
    ];

    const second = decideSidebarTaskTrigger(
      READY,
      REQUEST,
      closedTask,
      DECIDED_AT,
    );

    expect(second).toMatchObject({
      status: 'no-op',
      reason: 'condition-already-handled',
      idempotencyKey: first.idempotencyKey,
    });
  });

  it('creates a task for a later occurrence of the same SOP condition', () => {
    const first = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );
    const closedTask: SalesTaskTriggerRecord[] = [
      {
        idempotencyKey: first.idempotencyKey,
        taskId: 'task-1',
        taskStatus: 'COMPLETED',
      },
    ];

    const nextOccurrence = decideSidebarTaskTrigger(
      READY,
      { ...REQUEST, conditionKey: 'first-contact:customer-1:2026-10' },
      closedTask,
      DECIDED_AT,
    );

    expect(nextOccurrence.status).toBe('create');
  });

  it('treats a different SOP condition on the same customer as its own decision', () => {
    const first = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );
    const openTask: SalesTaskTriggerRecord[] = [
      {
        idempotencyKey: first.idempotencyKey,
        taskId: 'task-1',
        taskStatus: 'PENDING',
      },
    ];

    const decision = decideSidebarTaskTrigger(
      READY,
      { ...REQUEST, triggerKind: 'NO_FOLLOW_UP' },
      openTask,
      DECIDED_AT,
    );

    expect(decision.status).toBe('create');
  });

  it('does not read another tenant\'s identical condition as a duplicate', () => {
    const first = requireCreate(
      decideSidebarTaskTrigger(READY, REQUEST, [], DECIDED_AT),
    );
    const openTask: SalesTaskTriggerRecord[] = [
      {
        idempotencyKey: first.idempotencyKey,
        taskId: 'task-1',
        taskStatus: 'PENDING',
      },
    ];

    const decision = decideSidebarTaskTrigger(
      readyContext('workspace-2', 'customer-1'),
      REQUEST,
      openTask,
      DECIDED_AT,
    );

    expect(decision.status).toBe('create');
  });

  it('refuses to decide on a context that has no resolved customer', () => {
    const decision = decideSidebarTaskTrigger(
      blockedContext(),
      REQUEST,
      [],
      DECIDED_AT,
    );

    expect(decision).toMatchObject({
      status: 'no-op',
      reason: 'context-not-ready',
      existingTaskId: null,
    });
  });

  it('refuses a request for a customer the sidebar has moved away from', () => {
    const decision = decideSidebarTaskTrigger(
      READY,
      { ...REQUEST, customerId: 'customer-2' },
      [],
      DECIDED_AT,
    );

    expect(decision).toMatchObject({
      status: 'no-op',
      reason: 'customer-context-mismatch',
    });
  });

  it('rejects a condition that is not identifiable', () => {
    expect(() =>
      decideSidebarTaskTrigger(
        READY,
        { ...REQUEST, conditionKey: '  ' },
        [],
        DECIDED_AT,
      ),
    ).toThrow('conditionKey is required');
  });
});
