import type { SalesTaskStatus } from '../task/sales-task';
import {
  tenantResourceKey,
  type TenantContext,
} from '../tenant/tenant-context';

export const SALES_TASK_TRIGGER_KINDS = [
  'FIRST_CONTACT',
  'NO_FOLLOW_UP',
  'STAGE_DWELL',
] as const;

export type SalesTaskTriggerKind = (typeof SALES_TASK_TRIGGER_KINDS)[number];

export type SalesTaskTriggerRequest = {
  // The customer the SOP evaluated the condition against. It is compared with
  // the sidebar context so a stale request cannot be written to whatever
  // customer the sidebar has moved on to.
  customerId: string;
  triggerKind: SalesTaskTriggerKind;
  // Identifies one occurrence of the condition. A new occurrence is a new
  // decision; the same occurrence must never produce a second task.
  conditionKey: string;
  occurredAt: string;
};

// The ledger entry tying one condition occurrence to the task it produced.
// Held as its own record so the decision reads task state from the trigger that
// created it instead of re-deriving which task belongs to which condition.
export type SalesTaskTriggerRecord = {
  idempotencyKey: string;
  taskId: string;
  taskStatus: SalesTaskStatus;
};

export function salesTaskTriggerIdempotencyKey(
  tenant: TenantContext,
  request: Pick<
    SalesTaskTriggerRequest,
    'customerId' | 'triggerKind' | 'conditionKey'
  >,
): string {
  if (request.customerId.trim().length === 0) {
    throw new Error('customerId is required');
  }

  if (request.conditionKey.trim().length === 0) {
    throw new Error('conditionKey is required');
  }

  // Scoped by workspace, so an identical customer id, kind and condition in
  // another tenant yields a different key and is never read as a duplicate.
  return tenantResourceKey(
    tenant,
    'sales-task-trigger',
    JSON.stringify([
      request.customerId,
      request.triggerKind,
      request.conditionKey,
    ]),
  );
}
