import { isTenantOperable, normalizeTenantId } from './tenant-lifecycle';

describe('isTenantOperable', () => {
  it('serves business traffic only for an active tenant', () => {
    expect(isTenantOperable('ACTIVE')).toBe(true);
    expect(isTenantOperable('PROVISIONING')).toBe(false);
    expect(isTenantOperable('SUSPENDED')).toBe(false);
    expect(isTenantOperable('TERMINATED')).toBe(false);
  });
});

describe('normalizeTenantId', () => {
  it('keeps a resolved tenant id', () => {
    expect(normalizeTenantId('tenant-a')).toBe('tenant-a');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTenantId('  tenant-a  ')).toBe('tenant-a');
  });

  it('maps an unresolved tenant to null', () => {
    expect(normalizeTenantId(null)).toBeNull();
    expect(normalizeTenantId(undefined)).toBeNull();
    expect(normalizeTenantId('')).toBeNull();
    expect(normalizeTenantId('   ')).toBeNull();
  });
});
