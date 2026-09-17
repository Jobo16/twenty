export type SourceTouchpointKind =
  | 'CONTACT_CODE'
  | 'CUSTOMER_LINK'
  | 'IMPORT'
  | 'MANUAL'
  | 'BUSINESS_SYSTEM';

export type SourceTouchpoint = {
  id: string;
  customerId: string;
  occurredAt: string;
  kind: SourceTouchpointKind;
  sourceKey: string | null;
  sourceNameSnapshot: string | null;
  ownerMemberIdSnapshot: string | null;
};
