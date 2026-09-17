import {
  isMemberOperable,
  isMembershipOfTenant,
  type MemberMembership,
} from './member-membership';

const MEMBERSHIP: MemberMembership = {
  memberId: 'member-1',
  tenantId: 'tenant-a',
  role: 'SALES',
  status: 'ACTIVE',
  teamId: 'team-1',
  departmentId: 'department-1',
};

describe('isMemberOperable', () => {
  it('lets only an active member act', () => {
    expect(isMemberOperable('ACTIVE')).toBe(true);
    expect(isMemberOperable('SUSPENDED')).toBe(false);
    expect(isMemberOperable('REMOVED')).toBe(false);
  });
});

describe('isMembershipOfTenant', () => {
  it('binds the membership to its own tenant', () => {
    expect(isMembershipOfTenant(MEMBERSHIP, 'tenant-a')).toBe(true);
    expect(isMembershipOfTenant(MEMBERSHIP, 'tenant-b')).toBe(false);
  });

  it('refuses an unresolved tenant instead of matching loosely', () => {
    expect(isMembershipOfTenant(MEMBERSHIP, null)).toBe(false);
    expect(isMembershipOfTenant(MEMBERSHIP, '  ')).toBe(false);
  });
});
