import {
  type CustomerAttributionSnapshot,
  type CustomerLifecycleEvent,
  type CustomerLifecycleEventType,
} from '../lifecycle/customer-lifecycle-event';

export type CustomerLifecycleFact = {
  eventId: string;
  customerId: string;
  eventType: CustomerLifecycleEventType;
  occurredAt: string;
  attribution: CustomerAttributionSnapshot;
};

export function customerLifecycleFactFromEvent(
  event: CustomerLifecycleEvent,
): CustomerLifecycleFact {
  return {
    eventId: event.id,
    customerId: event.customerId,
    eventType: event.type,
    occurredAt: event.occurredAt,
    attribution: { ...event.attributionSnapshot },
  };
}
