export type CustomerAssignmentStatus = 'ACTIVE' | 'ENDED';

export type CustomerAssignment = {
  id: string;
  customerId: string;
  ownerMemberId: string;
  startedAt: string;
  endedAt: string | null;
  status: CustomerAssignmentStatus;
  reason: string | null;
};
