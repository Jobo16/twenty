export function requireIsoTimestamp(value: string, fieldName: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO timestamp`);
  }

  return value;
}
