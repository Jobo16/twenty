import { transitionSalesTask } from './transition-sales-task';
import { type SalesTask } from './sales-task';

const PENDING_TASK: SalesTask = {
  id: 'task-1',
  customerId: 'customer-1',
  assigneeMemberId: 'member-1',
  status: 'PENDING',
  dueAt: null,
  completedAt: null,
  canceledAt: null,
};

describe('transitionSalesTask', () => {
  it('records the completion time', () => {
    const accepted = transitionSalesTask(
      PENDING_TASK,
      'ACCEPTED',
      '2026-09-17T01:00:00.000Z',
    );
    const completed = transitionSalesTask(
      accepted,
      'COMPLETED',
      '2026-09-17T02:00:00.000Z',
    );

    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).toBe('2026-09-17T02:00:00.000Z');
  });

  it('rejects reopening a completed task', () => {
    const completed: SalesTask = {
      ...PENDING_TASK,
      status: 'COMPLETED',
      completedAt: '2026-09-17T02:00:00.000Z',
    };

    expect(() =>
      transitionSalesTask(
        completed,
        'IN_PROGRESS',
        '2026-09-17T03:00:00.000Z',
      ),
    ).toThrow('cannot transition task from COMPLETED to IN_PROGRESS');
  });
});
