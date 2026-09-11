-- TAMBAYAN — enforce event RSVP capacity in the database.
--
-- events.capacity is collected in NewEventForm and displayed everywhere as if
-- it were real ("12 / 20 going", a fill bar clamped with Math.min(100, …)),
-- but nothing ever checked it — RsvpControls upserted status: 'going'
-- unconditionally. The anon key is public in the browser, so a client-side
-- check is not enforcement; the database is the real boundary. Idempotent.

-- ---------------------------------------------------------------------------
-- enforce_event_rsvp_capacity — reject a 'going' row once the event is full.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_event_rsvp_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity int;
  v_going    int;
begin
  -- Only a row heading INTO 'going' consumes a seat. Freeing one (going ->
  -- interested/cancelled) or staying non-going never needs the check —
  -- "Interested" stays uncapped by design.
  if new.status <> 'going' then
    return new;
  end if;

  -- Lock the event row so two concurrent RSVPs on the same event serialize
  -- here instead of both reading the same going-count and both passing.
  select capacity into v_capacity from public.events where id = new.event_id for update;
  if v_capacity is null then
    return new;   -- uncapped event
  end if;

  -- Exclude by (event_id, profile_id), not by this row's id: `.upsert()`'s
  -- INSERT ... ON CONFLICT DO UPDATE path fires this same BEFORE INSERT
  -- trigger once for the speculative insert attempt (with a freshly
  -- defaulted id that can never match the pre-existing row), before falling
  -- back to the real UPDATE. Excluding by id would then count the caller's
  -- own already-'going' row against themselves on a plain going -> going
  -- re-upsert, wrongly rejecting a no-op. (event_id, profile_id) is unique on
  -- this table, so excluding by that pair correctly drops the caller's own
  -- row in every path: a plain insert (no existing row to exclude yet), a
  -- plain update (excludes the row being updated), and the speculative-insert
  -- half of an upsert (excludes the real row the conflict will update).
  select count(*) into v_going
  from public.event_rsvps
  where event_id = new.event_id
    and status = 'going'
    and profile_id <> new.profile_id;

  if v_going >= v_capacity then
    raise exception 'event is at capacity';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_event_rsvp_capacity on public.event_rsvps;
create trigger trg_event_rsvp_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_rsvp_capacity();
