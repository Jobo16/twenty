export const CUSTOMER_STAGES = [
  'NEW',
  'FOLLOWING',
  'QUALIFIED',
  'OPPORTUNITY',
  'WON',
  'LOST',
] as const;

export type CustomerStage = (typeof CUSTOMER_STAGES)[number];
