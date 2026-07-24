-- PAY-002: idempotency for Paddle webhook event ids in entitlement_events.metadata
create unique index if not exists entitlement_events_paddle_event_id_uidx
  on public.entitlement_events ((metadata->>'paddle_event_id'))
  where source = 'paddle'
    and metadata ? 'paddle_event_id'
    and (metadata->>'paddle_event_id') is not null
    and (metadata->>'paddle_event_id') <> '';
