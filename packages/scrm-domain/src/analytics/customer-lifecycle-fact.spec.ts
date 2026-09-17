import { customerLifecycleFactFromEvent } from './customer-lifecycle-fact';
import { type CustomerLifecycleEvent } from '../lifecycle/customer-lifecycle-event';

describe('customerLifecycleFactFromEvent', () => {
  it('keeps the historical dimensions when current names later change', () => {
    const event: CustomerLifecycleEvent = {
      id: 'event-1',
      customerId: 'customer-1',
      type: 'QUALIFIED',
      occurredAt: '2026-09-17T03:00:00.000Z',
      actorMemberId: 'member-1',
      attributionSnapshot: {
        ownerMemberId: 'member-1',
        ownerName: '销售旧名称',
        teamId: 'team-1',
        teamName: '一组',
        sourceId: 'source-1',
        sourceName: '渠道旧名称',
        contactCodeId: 'code-1',
        contactCodeName: '活码旧名称',
      },
      payload: {},
    };

    const fact = customerLifecycleFactFromEvent(event);

    expect(fact.attribution).toEqual(event.attributionSnapshot);
    expect(fact.attribution).not.toBe(event.attributionSnapshot);
  });
});
