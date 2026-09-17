export type CustomerLifecycleEventType =
  | 'ENTERED'
  | 'ASSIGNED'
  | 'FIRST_FOLLOW_UP'
  | 'QUALIFIED'
  | 'WON'
  | 'LOST';

export type CustomerAttributionSnapshot = {
  ownerMemberId: string | null;
  ownerName: string | null;
  teamId: string | null;
  teamName: string | null;
  sourceId: string | null;
  sourceName: string | null;
  contactCodeId: string | null;
  contactCodeName: string | null;
};

export type CustomerLifecycleEvent = {
  id: string;
  customerId: string;
  type: CustomerLifecycleEventType;
  occurredAt: string;
  actorMemberId: string | null;
  attributionSnapshot: CustomerAttributionSnapshot;
  payload: Readonly<Record<string, unknown>>;
};
