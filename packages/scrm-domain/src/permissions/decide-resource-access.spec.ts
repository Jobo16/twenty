import { type MemberMembership } from '../organization/member-membership';
import { decideResourceAccess } from './decide-resource-access';
import {
  type AccessSubject,
  type ResourceContext,
} from './resource-access-contract';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

function membershipWith(
  overrides: Partial<MemberMembership> = {},
): MemberMembership {
  return {
    memberId: 'member-sales',
    tenantId: TENANT_A,
    role: 'SALES',
    status: 'ACTIVE',
    teamId: 'team-1',
    departmentId: 'department-1',
    ...overrides,
  };
}

const SALES_MEMBER = membershipWith();
const TEAM_LEAD = membershipWith({
  memberId: 'member-lead',
  role: 'TEAM_LEAD',
});
const DEPARTMENT_HEAD = membershipWith({
  memberId: 'member-head',
  role: 'DEPARTMENT_HEAD',
});
const TENANT_ADMIN = membershipWith({
  memberId: 'member-admin',
  role: 'TENANT_ADMIN',
  teamId: null,
  departmentId: null,
});
const PLATFORM_OPERATOR = membershipWith({
  memberId: 'member-operator',
  role: 'PLATFORM_OPERATOR',
  teamId: null,
  departmentId: null,
});

function activeSubject(membership: MemberMembership | null): AccessSubject {
  return { tenantId: TENANT_A, tenantStatus: 'ACTIVE', membership };
}

const CUSTOMER_OWNED_BY_SALES_MEMBER: ResourceContext = {
  tenantId: TENANT_A,
  ownerMemberId: 'member-sales',
  ownerTeamId: 'team-1',
  ownerDepartmentId: 'department-1',
};

const CUSTOMER_OWNED_BY_TEAMMATE: ResourceContext = {
  ...CUSTOMER_OWNED_BY_SALES_MEMBER,
  ownerMemberId: 'member-other',
};

const CUSTOMER_OWNED_OUTSIDE_TEAM: ResourceContext = {
  tenantId: TENANT_A,
  ownerMemberId: 'member-elsewhere',
  ownerTeamId: 'team-2',
  ownerDepartmentId: 'department-2',
};

const UNASSIGNED_CUSTOMER: ResourceContext = {
  tenantId: TENANT_A,
  ownerMemberId: null,
  ownerTeamId: null,
  ownerDepartmentId: null,
};

const CUSTOMER_OF_ANOTHER_TENANT: ResourceContext = {
  ...CUSTOMER_OWNED_BY_SALES_MEMBER,
  tenantId: TENANT_B,
};

describe('decideResourceAccess tenant context', () => {
  it('refuses when the resource tenant cannot be resolved', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TENANT_ADMIN),
        resource: { ...CUSTOMER_OWNED_BY_SALES_MEMBER, tenantId: null },
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_CONTEXT_REQUIRED',
    });
  });

  it('refuses a blank resource tenant instead of treating it as resolved', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TENANT_ADMIN),
        resource: { ...CUSTOMER_OWNED_BY_SALES_MEMBER, tenantId: '   ' },
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_CONTEXT_REQUIRED',
    });
  });

  it('refuses when the operator tenant cannot be resolved', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: { ...activeSubject(TENANT_ADMIN), tenantId: null },
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'SUBJECT_TENANT_REQUIRED',
    });
  });

  it('refuses a suspended tenant that still has active administrators', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: { ...activeSubject(TENANT_ADMIN), tenantStatus: 'SUSPENDED' },
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_NOT_OPERABLE',
    });
  });

  it('refuses when the tenant status was never resolved', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: { ...activeSubject(TENANT_ADMIN), tenantStatus: null },
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_NOT_OPERABLE',
    });
  });
});

describe('decideResourceAccess membership', () => {
  it('refuses when no membership was resolved', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(null),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'MEMBERSHIP_REQUIRED',
    });
  });

  it('refuses a suspended member whose role would otherwise allow the action', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(membershipWith({ status: 'SUSPENDED' })),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'MEMBER_NOT_OPERABLE',
    });
  });

  it('refuses a membership resolved from another tenant', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(
          membershipWith({ role: 'TENANT_ADMIN', tenantId: TENANT_B }),
        ),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'MEMBERSHIP_TENANT_MISMATCH',
    });
  });
});

describe('decideResourceAccess tenant isolation', () => {
  it('refuses another tenant for a role that spans its own whole tenant', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TENANT_ADMIN),
        resource: CUSTOMER_OF_ANOTHER_TENANT,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_MISMATCH',
    });
  });

  it('refuses another tenant even when the owner id matches the operator', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OF_ANOTHER_TENANT,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'TENANT_MISMATCH',
    });
  });
});

describe('decideResourceAccess OWN scope', () => {
  it('allows a sales member to read the customer they own', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({ allowed: true, action: 'CUSTOMER_READ', dataScope: 'OWN' });
  });

  it('refuses a teammate customer because ownership is by member, not by team', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'RESOURCE_OUT_OF_SCOPE',
    });
  });

  it('refuses an unassigned customer because there is no owner to match', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(SALES_MEMBER),
        resource: UNASSIGNED_CUSTOMER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'RESOURCE_OUT_OF_SCOPE',
    });
  });
});

describe('decideResourceAccess TEAM scope', () => {
  it('allows a team lead to read a customer owned inside their team', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TEAM_LEAD),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({ allowed: true, action: 'CUSTOMER_READ', dataScope: 'TEAM' });
  });

  it('refuses a team lead reaching a customer owned by another team', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TEAM_LEAD),
        resource: CUSTOMER_OWNED_OUTSIDE_TEAM,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'RESOURCE_OUT_OF_SCOPE',
    });
  });

  it('refuses a team lead with no team of their own', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(
          membershipWith({ role: 'TEAM_LEAD', teamId: null }),
        ),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'RESOURCE_OUT_OF_SCOPE',
    });
  });
});

describe('decideResourceAccess DEPARTMENT and WORKSPACE scope', () => {
  it('allows a department head to read a customer owned inside their department', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(DEPARTMENT_HEAD),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({
      allowed: true,
      action: 'CUSTOMER_READ',
      dataScope: 'DEPARTMENT',
    });
  });

  it('refuses a department head reaching a customer owned by another department', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(DEPARTMENT_HEAD),
        resource: CUSTOMER_OWNED_OUTSIDE_TEAM,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'RESOURCE_OUT_OF_SCOPE',
    });
  });

  it('allows a tenant admin to read any customer inside the tenant', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(TENANT_ADMIN),
        resource: CUSTOMER_OWNED_OUTSIDE_TEAM,
      }),
    ).toEqual({
      allowed: true,
      action: 'CUSTOMER_READ',
      dataScope: 'WORKSPACE',
    });
  });
});

describe('decideResourceAccess role capability', () => {
  it('refuses export for a sales member on a customer they own', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_EXPORT',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_EXPORT',
      reason: 'ACTION_NOT_GRANTED_TO_ROLE',
    });
  });

  it('refuses transfer for a sales member', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_TRANSFER',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_TRANSFER',
      reason: 'ACTION_NOT_GRANTED_TO_ROLE',
    });
  });

  it('allows transfer for a team lead on a customer inside their team', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_TRANSFER',
        subject: activeSubject(TEAM_LEAD),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({
      allowed: true,
      action: 'CUSTOMER_TRANSFER',
      dataScope: 'TEAM',
    });
  });

  it('refuses export for a team lead', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_EXPORT',
        subject: activeSubject(TEAM_LEAD),
        resource: CUSTOMER_OWNED_BY_TEAMMATE,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_EXPORT',
      reason: 'ACTION_NOT_GRANTED_TO_ROLE',
    });
  });

  it('allows export for a tenant admin', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_EXPORT',
        subject: activeSubject(TENANT_ADMIN),
        resource: CUSTOMER_OWNED_OUTSIDE_TEAM,
      }),
    ).toEqual({
      allowed: true,
      action: 'CUSTOMER_EXPORT',
      dataScope: 'WORKSPACE',
    });
  });

  it('refuses every action for a platform operator', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_READ',
        subject: activeSubject(PLATFORM_OPERATOR),
        resource: CUSTOMER_OWNED_BY_SALES_MEMBER,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_READ',
      reason: 'ACTION_NOT_GRANTED_TO_ROLE',
    });
  });

  it('reports the capability refusal before the scope refusal', () => {
    expect(
      decideResourceAccess({
        action: 'CUSTOMER_EXPORT',
        subject: activeSubject(SALES_MEMBER),
        resource: CUSTOMER_OWNED_OUTSIDE_TEAM,
      }),
    ).toEqual({
      allowed: false,
      action: 'CUSTOMER_EXPORT',
      reason: 'ACTION_NOT_GRANTED_TO_ROLE',
    });
  });
});
