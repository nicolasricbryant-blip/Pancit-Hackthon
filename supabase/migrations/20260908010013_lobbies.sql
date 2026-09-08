-- TAMBAYAN — Lobbies (pickup groups for ranked/casual) + role-based auto-join.
--
-- A lobby is an ephemeral party a host opens to fill for ranked/casual play.
-- Players who opt into auto-join and whose main role fits an open slot are
-- matched in as `pending` and get a 60-second ready-check before they count.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- game_profiles.main_roles — player's main role(s) per game (config: GAMES[].roles)
-- ---------------------------------------------------------------------------
alter table public.game_profiles
  add column if not exists main_roles text[] not null default '{}';

-- owner can edit their own game_profiles row (needed for the main-role picker)
drop policy if exists game_profiles_update_own on public.game_profiles;
create policy game_profiles_update_own on public.game_profiles for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
drop policy if exists game_profiles_insert_own on public.game_profiles;
create policy game_profiles_insert_own on public.game_profiles for insert to authenticated
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- lobbies
-- ---------------------------------------------------------------------------
create table if not exists public.lobbies (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references public.profiles(id) on delete cascade,
  game_id      text not null references public.games(id),
  title        text not null,
  mode         text not null default 'ranked'
                 check (mode in ('ranked', 'casual', 'scrim_warmup')),
  rank_min     text,
  rank_max     text,
  slots_total  int  not null default 5 check (slots_total between 2 and 10),
  needed_roles text[] not null default '{}',
  mic_required boolean not null default false,
  auto_fill    boolean not null default true,
  status       text not null default 'open'
                 check (status in ('open', 'full', 'closed', 'expired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '2 hours')
);
drop trigger if exists trg_lobbies_updated on public.lobbies;
create trigger trg_lobbies_updated before update on public.lobbies
  for each row execute function public.set_updated_at();

create index if not exists idx_lobbies_open
  on public.lobbies (game_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- lobby_members  (host is auto-inserted by trigger; pending = awaiting ready-check)
-- ---------------------------------------------------------------------------
create table if not exists public.lobby_members (
  id         uuid primary key default gen_random_uuid(),
  lobby_id   uuid not null references public.lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text,
  joined_via text not null default 'manual'
               check (joined_via in ('host', 'manual', 'auto')),
  state      text not null default 'active' check (state in ('active', 'pending')),
  ready_by   timestamptz,
  created_at timestamptz not null default now(),
  unique (lobby_id, profile_id)
);
create index if not exists idx_lobby_members_lobby   on public.lobby_members (lobby_id);
create index if not exists idx_lobby_members_profile on public.lobby_members (profile_id);

-- ---------------------------------------------------------------------------
-- lobby_autojoin_prefs  (private to the owner, one row per profile+game)
-- ---------------------------------------------------------------------------
create table if not exists public.lobby_autojoin_prefs (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id    text not null references public.games(id),
  enabled    boolean not null default false,
  rank_min   text,
  rank_max   text,
  modes      text[] not null default '{ranked}',
  mic_ok     boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);
drop trigger if exists trg_autojoin_updated on public.lobby_autojoin_prefs;
create trigger trg_autojoin_updated before update on public.lobby_autojoin_prefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.lobbies              enable row level security;
alter table public.lobby_members        enable row level security;
alter table public.lobby_autojoin_prefs enable row level security;

drop policy if exists lobbies_read on public.lobbies;
create policy lobbies_read on public.lobbies for select using (true);

drop policy if exists lobbies_insert_host on public.lobbies;
create policy lobbies_insert_host on public.lobbies for insert to authenticated
  with check (host_id = auth.uid());

drop policy if exists lobbies_update_host on public.lobbies;
create policy lobbies_update_host on public.lobbies for update to authenticated
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

drop policy if exists lobbies_delete_host on public.lobbies;
create policy lobbies_delete_host on public.lobbies for delete to authenticated
  using (host_id = auth.uid() or public.is_admin());

drop policy if exists lobby_members_read on public.lobby_members;
create policy lobby_members_read on public.lobby_members for select using (true);

-- manual self-join, only to an OPEN lobby
drop policy if exists lobby_members_self_join on public.lobby_members;
create policy lobby_members_self_join on public.lobby_members for insert to authenticated
  with check (
    profile_id = auth.uid()
    and joined_via = 'manual'
    and exists (
      select 1 from public.lobbies l
      where l.id = lobby_id and l.status = 'open'
    )
  );

-- accept your own ready-check (state pending -> active) / edit your own row
drop policy if exists lobby_members_update_own on public.lobby_members;
create policy lobby_members_update_own on public.lobby_members for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- leave yourself, or host removes anyone
drop policy if exists lobby_members_delete on public.lobby_members;
create policy lobby_members_delete on public.lobby_members for delete to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.lobbies l where l.id = lobby_id and l.host_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists autojoin_all_own on public.lobby_autojoin_prefs;
create policy autojoin_all_own on public.lobby_autojoin_prefs for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- rank label within [p_min, p_max] by index in the game's ordered rank_tiers.
-- null bound = open; null / unknown candidate rank = pass (host can still kick).
create or replace function public.lobby_rank_ok(
  p_game text, p_rank text, p_min text, p_max text
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  with tiers as (
    select array(select jsonb_array_elements_text(rank_tiers)) as arr
    from public.games where id = p_game
  ),
  ix as (
    select
      (select arr from tiers) as arr,
      array_position((select arr from tiers), p_rank) as r,
      array_position((select arr from tiers), p_min)  as lo,
      array_position((select arr from tiers), p_max)  as hi
  )
  select
    p_rank is null
    or (select r from ix) is null
    or (
      ((select lo from ix) is null or (select r from ix) >= (select lo from ix))
      and
      ((select hi from ix) is null or (select r from ix) <= (select hi from ix))
    );
$$;

-- add the host as an active member + run a first matchmaker pass
create or replace function public.on_lobby_created()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.lobby_members (lobby_id, profile_id, joined_via, state)
  values (new.id, new.host_id, 'host', 'active')
  on conflict (lobby_id, profile_id) do nothing;
  perform public.run_lobby_matchmaker(new.id);
  return new;
end $$;

-- keep lobbies.status in sync with the active member count (never touches
-- closed/expired). Also re-runs the matchmaker when a slot frees up.
create or replace function public.recompute_lobby_fill()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_lobby  uuid := coalesce(new.lobby_id, old.lobby_id);
  v_total  int;
  v_status text;
  v_active int;
  v_want   text;
begin
  select slots_total, status into v_total, v_status
  from public.lobbies where id = v_lobby;
  if v_status is null or v_status in ('closed', 'expired') then
    return coalesce(new, old);
  end if;

  select count(*) into v_active
  from public.lobby_members where lobby_id = v_lobby and state = 'active';

  v_want := case when v_active >= v_total then 'full' else 'open' end;
  update public.lobbies set status = v_want
    where id = v_lobby and status <> v_want;

  if v_want = 'open' and tg_op = 'DELETE' then
    perform public.run_lobby_matchmaker(v_lobby);
  end if;
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- matchmaker
-- ---------------------------------------------------------------------------
-- Fill open role slots in a lobby with opted-in players whose main role fits.
-- Inserts them as `pending` with a 60s ready-check. Returns the count added.
create or replace function public.run_lobby_matchmaker(p_lobby uuid)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_l        public.lobbies%rowtype;
  v_active   int;
  v_pending  int;
  v_open     int;
  v_added    int := 0;
  r          record;
  v_role     text;
begin
  select * into v_l from public.lobbies where id = p_lobby;
  if not found or v_l.status <> 'open' or not v_l.auto_fill then
    return 0;
  end if;

  select
    count(*) filter (where state = 'active'),
    count(*) filter (where state = 'pending')
  into v_active, v_pending
  from public.lobby_members where lobby_id = p_lobby;

  v_open := v_l.slots_total - v_active - v_pending;
  if v_open <= 0 then return 0; end if;

  for r in
    select pr.profile_id, gp.main_roles
    from public.lobby_autojoin_prefs pr
    join public.game_profiles gp
      on gp.profile_id = pr.profile_id and gp.game_id = pr.game_id
    where pr.enabled
      and pr.game_id = v_l.game_id
      and v_l.mode = any (pr.modes)
      and (pr.mic_ok or not v_l.mic_required)
      and pr.profile_id <> v_l.host_id
      and (
        coalesce(array_length(v_l.needed_roles, 1), 0) = 0
        or gp.main_roles && v_l.needed_roles
        or 'Flex' = any (gp.main_roles)
        or 'Flex' = any (v_l.needed_roles)
      )
      and public.lobby_rank_ok(
            v_l.game_id, gp.rank_label,
            coalesce(v_l.rank_min, pr.rank_min),
            coalesce(v_l.rank_max, pr.rank_max))
      and not exists (
        select 1 from public.lobby_members m
        where m.lobby_id = p_lobby and m.profile_id = pr.profile_id
      )
      and not exists (
        select 1 from public.lobby_members m
        join public.lobbies l2 on l2.id = m.lobby_id
        where m.profile_id = pr.profile_id
          and m.state = 'active'
          and l2.status in ('open', 'full')
      )
    order by random()
    limit v_open
  loop
    v_role := coalesce(
      (select x from unnest(v_l.needed_roles) x
       where x = any (r.main_roles) limit 1),
      (select x from unnest(r.main_roles) x where x <> 'Flex' limit 1),
      r.main_roles[1]
    );
    insert into public.lobby_members
      (lobby_id, profile_id, role, joined_via, state, ready_by)
    values
      (p_lobby, r.profile_id, v_role, 'auto', 'pending', now() + interval '60 seconds')
    on conflict (lobby_id, profile_id) do nothing;
    v_added := v_added + 1;
  end loop;

  return v_added;
end $$;

-- caller accepts their own ready-check
create or replace function public.lobby_accept_match(p_lobby uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_hit int;
begin
  update public.lobby_members
    set state = 'active', ready_by = null
    where lobby_id = p_lobby
      and profile_id = auth.uid()
      and state = 'pending'
      and (ready_by is null or ready_by > now());
  get diagnostics v_hit = row_count;
  if v_hit = 0 then
    raise exception 'no pending match to accept (it may have expired)';
  end if;
end $$;

-- turn on auto-join for a game, save prefs, and immediately back-scan open lobbies.
-- returns the number of lobbies the caller was matched into (0 or 1).
create or replace function public.enable_autojoin(
  p_game text,
  p_rank_min text,
  p_rank_max text,
  p_modes text[],
  p_mic_ok boolean
) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_me    uuid := auth.uid();
  v_lobby uuid;
  v_before int;
  v_after  int;
begin
  if v_me is null then raise exception 'not signed in'; end if;

  insert into public.lobby_autojoin_prefs
    (profile_id, game_id, enabled, rank_min, rank_max, modes, mic_ok)
  values
    (v_me, p_game, true, p_rank_min, p_rank_max,
     coalesce(p_modes, '{ranked}'), coalesce(p_mic_ok, true))
  on conflict (profile_id, game_id) do update set
    enabled = true,
    rank_min = excluded.rank_min,
    rank_max = excluded.rank_max,
    modes = excluded.modes,
    mic_ok = excluded.mic_ok;

  for v_lobby in
    select id from public.lobbies
    where game_id = p_game and status = 'open' and auto_fill
    order by created_at desc
    limit 20
  loop
    select count(*) into v_before
      from public.lobby_members where lobby_id = v_lobby and profile_id = v_me;
    perform public.run_lobby_matchmaker(v_lobby);
    select count(*) into v_after
      from public.lobby_members where lobby_id = v_lobby and profile_id = v_me;
    if v_after > v_before then
      return 1;
    end if;
  end loop;
  return 0;
end $$;

-- lazy housekeeping: expire timed-out lobbies + drop stale ready-checks.
-- Called from the /lobbies server component on read. Safe for anon.
create or replace function public.expire_stale_lobbies()
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.lobby_members
    where state = 'pending' and ready_by is not null and ready_by < now();
  update public.lobbies set status = 'expired'
    where status in ('open', 'full') and expires_at < now();
end $$;

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_lobby_created on public.lobbies;
create trigger trg_lobby_created after insert on public.lobbies
  for each row execute function public.on_lobby_created();

drop trigger if exists trg_lobby_fill on public.lobby_members;
create trigger trg_lobby_fill after insert or update or delete on public.lobby_members
  for each row execute function public.recompute_lobby_fill();

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant execute on function public.lobby_rank_ok(text, text, text, text) to authenticated, anon;
grant execute on function public.run_lobby_matchmaker(uuid)            to authenticated;
grant execute on function public.lobby_accept_match(uuid)              to authenticated;
grant execute on function public.enable_autojoin(text, text, text, text[], boolean) to authenticated;
grant execute on function public.expire_stale_lobbies()               to authenticated, anon;
