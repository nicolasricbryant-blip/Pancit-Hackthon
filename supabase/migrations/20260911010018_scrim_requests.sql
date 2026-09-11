-- TAMBAYAN — scrim requests (Request Scrim, for real).
--
-- A scrim_listing is an open invitation; a scrim_request is one team formally
-- asking to fill it. Distinct from scrim_matches, which is the BOOKED result
-- once a request is accepted. Idempotent.

-- ---------------------------------------------------------------------------
-- scrim_requests
-- ---------------------------------------------------------------------------
create table if not exists public.scrim_requests (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.scrim_listings(id) on delete cascade,
  from_team    uuid not null references public.teams(id) on delete cascade,
  to_team      uuid not null references public.teams(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  message      text,
  status       text not null default 'pending'
                 check (status in ('pending','accepted','declined','cancelled')),
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  match_id     uuid references public.scrim_matches(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint scrim_requests_distinct_teams check (from_team <> to_team),
  unique (listing_id, from_team)
);
drop trigger if exists trg_scrim_requests_updated on public.scrim_requests;
create trigger trg_scrim_requests_updated before update on public.scrim_requests
  for each row execute function public.set_updated_at();

create index if not exists idx_scrim_requests_to_team
  on public.scrim_requests(to_team, status);
create index if not exists idx_scrim_requests_from_team
  on public.scrim_requests(from_team, status);

-- ---------------------------------------------------------------------------
-- RLS — private negotiations, not public-read like listings/matches.
-- ---------------------------------------------------------------------------
alter table public.scrim_requests enable row level security;

drop policy if exists scrim_requests_read on public.scrim_requests;
create policy scrim_requests_read on public.scrim_requests for select
  using (
    exists (
      select 1 from public.teams t
      where t.id in (from_team, to_team) and t.handler_id = auth.uid()
    )
    or auth.uid() = requested_by
    or public.is_admin()
  );

drop policy if exists scrim_requests_insert_handler on public.scrim_requests;
create policy scrim_requests_insert_handler on public.scrim_requests for insert
  with check (
    auth.uid() = requested_by
    and exists (
      select 1 from public.teams t where t.id = from_team and t.handler_id = auth.uid()
    )
  );

-- Accept/decline (to_team's handler) or cancel (from_team's handler).
drop policy if exists scrim_requests_update_party on public.scrim_requests;
create policy scrim_requests_update_party on public.scrim_requests for update
  using (
    exists (select 1 from public.teams t where t.id = to_team and t.handler_id = auth.uid())
    or exists (select 1 from public.teams t where t.id = from_team and t.handler_id = auth.uid())
  )
  with check (
    exists (select 1 from public.teams t where t.id = to_team and t.handler_id = auth.uid())
    or exists (select 1 from public.teams t where t.id = from_team and t.handler_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- accept_scrim_request — atomically book the match, mirroring accept_mentorship.
--
-- SECURITY DEFINER bypasses RLS entirely, so the explicit to_team-handler check
-- below is the only thing standing between a caller and accepting someone
-- else's request — it is not a redundant belt-and-suspenders check.
-- ---------------------------------------------------------------------------
create or replace function public.accept_scrim_request(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req     public.scrim_requests%rowtype;
  v_listing public.scrim_listings%rowtype;
  v_match   uuid;
begin
  select * into v_req from public.scrim_requests where id = p_id for update;
  if not found then
    raise exception 'scrim request not found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'scrim request is no longer pending';
  end if;

  if not exists (
    select 1 from public.teams t
    where t.id = v_req.to_team and t.handler_id = auth.uid()
  ) then
    raise exception 'not authorized to accept this request';
  end if;

  select * into v_listing from public.scrim_listings where id = v_req.listing_id for update;
  if not found then
    raise exception 'listing no longer exists';
  end if;

  insert into public.scrim_matches
    (listing_id, game_id, team_a, team_b, scheduled_at, format, ruleset, status)
  values
    (v_listing.id, v_listing.game_id, v_req.to_team, v_req.from_team,
     v_listing.starts_at, v_listing.format, v_listing.ruleset, 'booked')
  returning id into v_match;

  update public.scrim_requests
  set status = 'accepted',
      responded_by = auth.uid(),
      responded_at = now(),
      match_id = v_match
  where id = p_id;

  update public.scrim_listings
  set status = 'matched'
  where id = v_listing.id;

  -- Any other still-open bids on this listing are moot now that it's booked.
  update public.scrim_requests
  set status = 'declined',
      responded_by = auth.uid(),
      responded_at = now()
  where listing_id = v_listing.id
    and id <> p_id
    and status = 'pending';

  return v_match;
end
$$;

grant execute on function public.accept_scrim_request(uuid) to authenticated;
