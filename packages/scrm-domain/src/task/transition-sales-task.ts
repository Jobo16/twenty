import { type SalesTask, type SalesTaskStatus } from './sales-task';

const ALLOWED_TRANSITIONS: Record<SalesTaskStatus, SalesTaskStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELED'],
  ACCEPTED: ['IN_PROGRESS', 'COMPLETED', 'CANCELED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
};

export function transitionSalesTask(
  task: SalesTask,
  nextStatus: SalesTaskStatus,
  occurredAt: string,
): SalesTask {
  if (!ALLOWED_TRANSITIONS[task.status].includes(nextStatus)) {
    throw new Error(
      `cannot transition task from ${task.status} to ${nextStatus}`,
    );
  }

  if (Number.isNaN(Date.parse(occurredAt))) {
    throw new Error('occurredAt must be an ISO timestamp');
  }

  return {
    ...task,
    status: nextStatus,
    completedAt: nextStatus === 'COMPLETED' ? occurredAt : task.completedAt,
    canceledAt: nextStatus === 'CANCELED' ? occurredAt : task.canceledAt,
  };
}
