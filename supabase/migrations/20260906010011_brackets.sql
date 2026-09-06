-- TAMBAYAN — Wave 3b · bracketing system.
--   tournaments + entrants + bracket_matches, seeded single-elim (power-of-two),
--   host-driven generation + advancement, Elo + player-rating + standing effects
--   on completion. Idempotent.

set check_function_bodies = off;

-- ===========================================================================
-- tables
-- ===========================================================================
create table if not exists public.tournaments (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  game_id          text not null references public.games(id),
  event_id         uuid references public.events(id) on delete set null,
  org_id           uuid references public.orgs(id) on delete set null,
  host_profile_id  uuid references public.profiles(id) on delete set null,
  format           text not null default 'single_elim' check (format in ('single_elim')),
  scope            text not null default 'local' check (scope in ('local','regional','nationwide')),
  region           text,
  size             int  not null default 8 check (size in (4, 8, 16, 32)),
  status           text not null default 'registration'
                     check (status in ('registration','live','completed','cancelled')),
  rating_effect    boolean not null default true,
  champion_team_id uuid references public.teams(id) on delete set null,
  starts_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_tournaments_updated on public.tournaments;
create trigger trg_tournaments_updated before update on public.tournaments
  for each row execute function public.set_updated_at();
create index if not exists idx_tournaments_game_status on public.tournaments(game_id, status);

create table if not exists public.tournament_entrants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  seed          int,
  registered_by uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create table if not exists public.bracket_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         int not null,               -- 1 = first round
  slot          int not null,               -- 0-based position within the round
  team_a        uuid references public.teams(id) on delete set null,
  team_b        uuid references public.teams(id) on delete set null,
  score_a       int,
  score_b       int,
  winner        uuid references public.teams(id) on delete set null,
  status        text not null default 'pending'
                  check (status in ('pending','ready','reported','confirmed')),
  next_match_id uuid references public.bracket_matches(id) on delete set null,
  next_slot     int check (next_slot in (0, 1)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, round, slot)
);
drop trigger if exists trg_bracket_matches_updated on public.bracket_matches;
create trigger trg_bracket_matches_updated before update on public.bracket_matches
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.tournaments        enable row level security;
alter table public.tournament_entrants enable row level security;
alter table public.bracket_matches    enable row level security;

drop policy if exists tournaments_read on public.tournaments;
create policy tournaments_read on public.tournaments for select using (true);
drop policy if exists tournaments_insert_host on public.tournaments;
create policy tournaments_insert_host on public.tournaments for insert
  with check (auth.uid() = host_profile_id);
drop policy if exists tournaments_update_host on public.tournaments;
create policy tournaments_update_host on public.tournaments for update
  using (auth.uid() = host_profile_id
         or (org_id is not null and public.is_org_admin(org_id))
         or public.is_admin())
  with check (auth.uid() = host_profile_id
         or (org_id is not null and public.is_org_admin(org_id))
         or public.is_admin());

-- a team handler registers their own team; the host can remove any entrant
drop policy if exists entrants_read on public.tournament_entrants;
create policy entrants_read on public.tournament_entrants for select using (true);
drop policy if exists entrants_handler_insert on public.tournament_entrants;
create policy entrants_handler_insert on public.tournament_entrants for insert
  with check (exists (select 1 from public.teams t
                      where t.id = team_id and t.handler_id = auth.uid()));
drop policy if exists entrants_handler_or_host_delete on public.tournament_entrants;
create policy entrants_handler_or_host_delete on public.tournament_entrants for delete
  using (exists (select 1 from public.teams t where t.id = team_id and t.handler_id = auth.uid())
         or exists (select 1 from public.tournaments tr
                    where tr.id = tournament_id and tr.host_profile_id = auth.uid()));

drop policy if exists bracket_read on public.bracket_matches;
create policy bracket_read on public.bracket_matches for select using (true);
-- match writes go through SECURITY DEFINER RPCs only — no direct write policy.

-- ===========================================================================
-- bracket generation — seeded single-elim, requires exactly `size` entrants
-- ===========================================================================
create or replace function public.generate_bracket(p_tournament uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t            record;
  n_entrants   int;
  r            int;
  n_rounds     int;
  matches_in_r int;
  i            int;
  seeded       uuid[];
  hi           int;
  lo           int;
  m_id         uuid;
  prev_ids     uuid[] := '{}';
  curr_ids     uuid[];
begin
  select * into t from public.tournaments where id = p_tournament;
  if t is null then raise exception 'tournament not found'; end if;
  if t.host_profile_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the host can generate the bracket';
  end if;
  if t.status <> 'registration' then raise exception 'bracket already generated'; end if;

  select count(*) into n_entrants from public.tournament_entrants where tournament_id = p_tournament;
  if n_entrants <> t.size then
    raise exception 'need exactly % teams to start (have %)', t.size, n_entrants;
  end if;

  -- seed by current team rating in this game, best first; ties + unrated broken by name
  select array_agg(e.team_id order by coalesce(rt.rating, 1500) desc, tm.name) into seeded
  from public.tournament_entrants e
  join public.teams tm on tm.id = e.team_id
  left join public.ratings rt on rt.team_id = e.team_id and rt.game_id = t.game_id
  where e.tournament_id = p_tournament;

  for i in 1 .. n_entrants loop
    update public.tournament_entrants set seed = i
      where tournament_id = p_tournament and team_id = seeded[i];
  end loop;

  n_rounds := (ln(t.size) / ln(2))::int;

  -- build rounds from the final backwards so next_match_id can be set going forward
  for r in reverse n_rounds .. 1 loop
    matches_in_r := t.size / (2 ^ r);
    curr_ids := '{}';
    for i in 0 .. matches_in_r - 1 loop
      insert into public.bracket_matches (tournament_id, round, slot, status,
        next_match_id, next_slot)
      values (
        p_tournament, r, i,
        case when r = 1 then 'ready' else 'pending' end,
        case when r = n_rounds then null else prev_ids[(i / 2) + 1] end,
        case when r = n_rounds then null else i % 2 end
      )
      returning id into m_id;
      curr_ids := array_append(curr_ids, m_id);
    end loop;
    prev_ids := curr_ids;
  end loop;

  -- fill round 1 with standard bracket seeding (1 vs N, 2 vs N-1, ...)
  for i in 0 .. (t.size / 2) - 1 loop
    hi := i + 1;
    lo := t.size - i;
    update public.bracket_matches set
      team_a = (select team_id from public.tournament_entrants where tournament_id = p_tournament and seed = hi),
      team_b = (select team_id from public.tournament_entrants where tournament_id = p_tournament and seed = lo)
    where tournament_id = p_tournament and round = 1 and slot = i;
  end loop;

  update public.tournaments set status = 'live', updated_at = now() where id = p_tournament;
end $$;

-- ===========================================================================
-- advance a bracket match — host reports score, winner flows to the next round
-- ===========================================================================
create or replace function public.advance_bracket_match(p_match uuid, p_score_a int, p_score_b int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  bm       record;
  t        record;
  win      uuid;
  k        constant numeric := 24;
  ra numeric; rb numeric; ea numeric; sa numeric;
begin
  select * into bm from public.bracket_matches where id = p_match;
  if bm is null then raise exception 'match not found'; end if;
  select * into t from public.tournaments where id = bm.tournament_id;
  if t.host_profile_id <> auth.uid()
     and not (t.org_id is not null and public.is_org_admin(t.org_id))
     and not public.is_admin() then
    raise exception 'only the host can report bracket results';
  end if;
  if bm.team_a is null or bm.team_b is null then
    raise exception 'both slots must be filled first';
  end if;
  if p_score_a = p_score_b then raise exception 'a bracket match cannot be a draw'; end if;

  win := case when p_score_a > p_score_b then bm.team_a else bm.team_b end;

  update public.bracket_matches
    set score_a = p_score_a, score_b = p_score_b, winner = win,
        status = 'confirmed', updated_at = now()
  where id = p_match;

  -- push the winner into the next match
  if bm.next_match_id is not null then
    if bm.next_slot = 0 then
      update public.bracket_matches set team_a = win,
        status = case when team_b is not null then 'ready' else status end
        where id = bm.next_match_id;
    else
      update public.bracket_matches set team_b = win,
        status = case when team_a is not null then 'ready' else status end
        where id = bm.next_match_id;
    end if;
  else
    -- that was the final
    update public.tournaments
      set champion_team_id = win, status = 'completed', updated_at = now()
      where id = t.id;
  end if;

  -- rating + standing effects (opt-out via tournaments.rating_effect)
  if t.rating_effect then
    perform public.ensure_team_rating(t.game_id, bm.team_a);
    perform public.ensure_team_rating(t.game_id, bm.team_b);
    select rating into ra from public.ratings where game_id = t.game_id and team_id = bm.team_a for update;
    select rating into rb from public.ratings where game_id = t.game_id and team_id = bm.team_b for update;
    sa := case when win = bm.team_a then 1 else 0 end;
    ea := 1.0 / (1.0 + power(10, (rb - ra) / 400.0));
    update public.ratings set rating = round(ra + k * (sa - ea), 1),
      matches_played = matches_played + 1, wins = wins + sa::int, losses = losses + (1 - sa)::int,
      updated_at = now() where game_id = t.game_id and team_id = bm.team_a;
    update public.ratings set rating = round(rb + k * ((1 - sa) - (1 - ea)), 1),
      matches_played = matches_played + 1, wins = wins + (1 - sa)::int, losses = losses + sa::int,
      updated_at = now() where game_id = t.game_id and team_id = bm.team_b;
  end if;

  -- playing a bracket match is presence: +3 standing each
  update public.community_standing set points = points + 3, updated_at = now()
    where team_id in (bm.team_a, bm.team_b);

  -- mirror team rating onto its current roster so the PLAYER leaderboard fills
  -- (MVP heuristic: a player's rating tracks their team's rating in that game)
  insert into public.ratings (game_id, profile_id, rating)
  select t.game_id, m.profile_id, coalesce(r.rating, 1500)
  from public.team_members m
  join public.ratings r on r.team_id = m.team_id and r.game_id = t.game_id
  where m.team_id in (bm.team_a, bm.team_b)
  on conflict (game_id, profile_id) where profile_id is not null
  do update set rating = excluded.rating, updated_at = now();
end $$;

grant execute on function public.generate_bracket(uuid) to authenticated;
grant execute on function public.advance_bracket_match(uuid, int, int) to authenticated;

-- ===========================================================================
-- demo tournament — 4 MLBB teams, bracket generated, round 1 ready
-- ===========================================================================
do $$
declare
  tr uuid := md5('tambayan:tournament:demo-mlbb-s0')::uuid;
  team_names text[] := array[
    'UP Fighting Maroons Esports','DLSU Green Gaming','Ateneo Blue Spark','UST Growling Tigers Esports'];
  tn text;
  ti uuid;
begin
  if not exists (select 1 from public.tournaments where id = tr) then
    insert into public.tournaments (id, slug, name, game_id, format, scope, region, size, status, rating_effect, starts_at)
    values (tr, 'tambayan-mlbb-season-0', 'TAMBAYAN MLBB — Season 0 Cup', 'mlbb', 'single_elim',
            'nationwide', 'Nationwide', 4, 'registration', true, now() + interval '5 days');
    foreach tn in array team_names loop
      select id into ti from public.teams where name = tn limit 1;
      if ti is not null then
        insert into public.tournament_entrants (tournament_id, team_id)
        values (tr, ti) on conflict do nothing;
      end if;
    end loop;
    -- auto-generate the bracket if all 4 teams resolved (best-effort for the demo)
    if (select count(*) from public.tournament_entrants where tournament_id = tr) = 4 then
      begin
        perform public.generate_bracket(tr);
      exception when others then
        null;
      end;
    end if;
  end if;
end $$;
