import type { SalesTaskStatus } from '../task/sales-task';
import { requireIsoTimestamp } from '../wecom/wecom-time';
import {
  isReadySidebarContext,
  type ReadySidebarContext,
  type SidebarContext,
} from './sidebar-context';
import {
  salesTaskTriggerIdempotencyKey,
  type SalesTaskTriggerRecord,
  type SalesTaskTriggerRequest,
} from './sales-task-trigger';

export type SalesTaskTriggerNoOpReason =
  | 'context-not-ready'
  | 'customer-context-mismatch'
  | 'task-already-active'
  | 'condition-already-handled';

export type SalesTaskTriggerDecision =
  | {
      status: 'create';
      idempotencyKey: string;
      context: ReadySidebarContext;
      request: SalesTaskTriggerRequest;
      decidedAt: string;
    }
  | {
      status: 'no-op';
      reason: SalesTaskTriggerNoOpReason;
      idempotencyKey: string;
      // The task that already owns this condition, when there is one.
      existingTaskId: string | null;
      decidedAt: string;
    };

// Statuses in which a task no longer owns its condition.
const CLOSED_SALES_TASK_STATUSES: readonly SalesTaskStatus[] = [
  'COMPLETED',
  'CANCELED',
];

// One condition occurrence produces at most one task. The key is derived here,
// never supplied by the caller, so a repeated sidebar open, a retried SOP run
// or a replayed job all collapse onto the same decision.
export function decideSidebarTaskTrigger(
  context: SidebarContext,
  request: SalesTaskTriggerRequest,
  existingTriggers: readonly SalesTaskTriggerRecord[],
  decidedAt: string,
): SalesTaskTriggerDecision {
  const decidedAtIso = requireIsoTimestamp(decidedAt, 'decidedAt');
  requireIsoTimestamp(request.occurredAt, 'occurredAt');

  const idempotencyKey = salesTaskTriggerIdempotencyKey(context.tenant, request);

  const noOp = (
    reason: SalesTaskTriggerNoOpReason,
    existingTaskId: string | null = null,
  ): SalesTaskTriggerDecision => ({
    status: 'no-op',
    reason,
    idempotencyKey,
    existingTaskId,
    decidedAt: decidedAtIso,
  });

  // An incomplete, expired or conflicting context can only ask for a fresh
  // resolution; it must not reach a write with a customer it never resolved.
  if (!isReadySidebarContext(context)) {
    return noOp('context-not-ready');
  }

  // The sidebar may have moved to another customer between evaluation and
  // decision, in which case this request belongs to nobody.
  if (request.customerId !== context.customerId) {
    return noOp('customer-context-mismatch');
  }

  const existingTrigger = existingTriggers.find(
    (trigger) => trigger.idempotencyKey === idempotencyKey,
  );

  if (existingTrigger !== undefined) {
    const conditionClosed = CLOSED_SALES_TASK_STATUSES.includes(
      existingTrigger.taskStatus,
    );

    // A closed task does not reopen the same condition: the occurrence was
    // already handled. A later occurrence carries a new conditionKey instead.
    return noOp(
      conditionClosed ? 'condition-already-handled' : 'task-already-active',
      existingTrigger.taskId,
    );
  }

  return {
    status: 'create',
    idempotencyKey,
    context,
    request,
    decidedAt: decidedAtIso,
  };
}
