export const CUSTOMER_IDENTITY_PROVIDERS = [
  'WECOM_EXTERNAL_CONTACT',
  'PHONE',
  'EMAIL',
  'BUSINESS_SYSTEM',
] as const;

export type CustomerIdentityProvider =
  (typeof CUSTOMER_IDENTITY_PROVIDERS)[number];

export type CustomerIdentity = {
  id: string;
  customerId: string;
  connectionId?: string;
  provider: CustomerIdentityProvider;
  externalId: string;
  unionId?: string;
};

export function customerIdentityKey(
  identity: Pick<
    CustomerIdentity,
    'connectionId' | 'provider' | 'externalId'
  >,
): string {
  if (identity.externalId.length === 0) {
    throw new Error('externalId is required');
  }

  return JSON.stringify([
    identity.connectionId ?? null,
    identity.provider,
    identity.externalId,
  ]);
}
