export type SalesTaskStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

export type SalesTask = {
  id: string;
  customerId: string | null;
  assigneeMemberId: string | null;
  status: SalesTaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
};
