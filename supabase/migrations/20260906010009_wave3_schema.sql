-- TAMBAYAN — Wave 3 schema.
--   1. profiles.onboarded / school_other  (onboarding polish for non-.edu.ph testers)
--   2. profiles.trusted_submitter + rank fast-track trigger
--   3. orgs + org_members + teams.org_id  (org pages)
--   4. Elo rating + reliability recompute on confirmed matches (system-managed)
--   5. head_to_head view (derived from scrim_matches, no new table)
--   6. updated per-game rank form_fields (peak / mode now render as selects)
-- Idempotent: safe to re-run (Supabase GitHub integration may re-apply).

set check_function_bodies = off;

-- ===========================================================================
-- 1 · profiles: onboarded flag + free-text school fallback
-- ===========================================================================
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists school_other text;
alter table public.profiles add column if not exists trusted_submitter boolean not null default false;

-- Backfill: anyone who already has a handle or a linked school has finished setup.
update public.profiles
  set onboarded = true
  where onboarded = false and (handle is not null or school_id is not null);

-- ===========================================================================
-- 2 · orgs (varsity programs / communities / collegiate leagues)
-- ===========================================================================
create table if not exists public.orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  short_name text,
  kind       text not null default 'varsity'
               check (kind in ('varsity','community','collegiate_league','content')),
  school_id  uuid references public.schools(id) on delete set null,
  region     text,
  logo_url   text,
  bio        text,
  links      jsonb not null default '{}',        -- {discord, facebook, x, ...}
  owner_id   uuid references public.profiles(id) on delete set null,
  verified   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_orgs_updated on public.orgs;
create trigger trg_orgs_updated before update on public.orgs
  for each row execute function public.set_updated_at();

create table if not exists public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member'
               check (role in ('owner','admin','manager','member')),
  title      text,
  joined_at  timestamptz not null default now(),
  unique (org_id, profile_id)
);

alter table public.teams add column if not exists org_id uuid references public.orgs(id) on delete set null;
create index if not exists idx_teams_org on public.teams(org_id);

-- helper: is the caller an owner/admin of this org?
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.orgs o where o.id = p_org_id and o.owner_id = auth.uid()
  ) or exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.profile_id = auth.uid() and m.role in ('owner','admin')
  );
$$;

-- ===========================================================================
-- 3 · RLS for the new tables
-- ===========================================================================
alter table public.orgs        enable row level security;
alter table public.org_members enable row level security;

drop policy if exists orgs_read on public.orgs;
create policy orgs_read on public.orgs for select using (true);
drop policy if exists orgs_insert_owner on public.orgs;
create policy orgs_insert_owner on public.orgs for insert with check (auth.uid() = owner_id);
drop policy if exists orgs_update_admin on public.orgs;
create policy orgs_update_admin on public.orgs for update
  using (auth.uid() = owner_id or public.is_org_admin(id) or public.is_admin())
  with check (auth.uid() = owner_id or public.is_org_admin(id) or public.is_admin());
drop policy if exists orgs_delete_owner on public.orgs;
create policy orgs_delete_owner on public.orgs for delete
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists org_members_read on public.org_members;
create policy org_members_read on public.org_members for select using (true);
drop policy if exists org_members_admin_write on public.org_members;
create policy org_members_admin_write on public.org_members for all
  using (public.is_org_admin(org_id) or public.is_admin())
  with check (public.is_org_admin(org_id) or public.is_admin());
-- let a user remove their own membership
drop policy if exists org_members_self_leave on public.org_members;
create policy org_members_self_leave on public.org_members for delete
  using (auth.uid() = profile_id);

-- ===========================================================================
-- 4 · Elo rating + reliability recompute — fires when a match becomes confirmed
-- ===========================================================================
create or replace function public.ensure_team_rating(p_game text, p_team uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.ratings where game_id = p_game and team_id = p_team) then
    insert into public.ratings (game_id, team_id, rating) values (p_game, p_team, 1500);
  end if;
end $$;

create or replace function public.ensure_team_reliability(p_team uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.reliability_scores where team_id = p_team) then
    insert into public.reliability_scores (team_id, score) values (p_team, 100);
  end if;
end $$;

create or replace function public.apply_match_result()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  k    constant numeric := 32;
  ra   numeric;
  rb   numeric;
  ea   numeric;
  sa   numeric;
begin
  -- Only act on the transition INTO 'confirmed' with a decided winner.
  if new.status <> 'confirmed' or new.winner is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    return new;  -- already applied
  end if;

  perform public.ensure_team_rating(new.game_id, new.team_a);
  perform public.ensure_team_rating(new.game_id, new.team_b);

  select rating into ra from public.ratings where game_id = new.game_id and team_id = new.team_a for update;
  select rating into rb from public.ratings where game_id = new.game_id and team_id = new.team_b for update;

  sa := case when new.winner = new.team_a then 1 else 0 end;
  ea := 1.0 / (1.0 + power(10, (rb - ra) / 400.0));

  update public.ratings set
    rating = round(ra + k * (sa - ea), 1),
    matches_played = matches_played + 1,
    wins   = wins   + sa::int,
    losses = losses + (1 - sa)::int,
    updated_at = now()
  where game_id = new.game_id and team_id = new.team_a;

  update public.ratings set
    rating = round(rb + k * ((1 - sa) - (1 - ea)), 1),
    matches_played = matches_played + 1,
    wins   = wins   + (1 - sa)::int,
    losses = losses + sa::int,
    updated_at = now()
  where game_id = new.game_id and team_id = new.team_b;

  -- reliability: both teams completed a scrim
  perform public.ensure_team_reliability(new.team_a);
  perform public.ensure_team_reliability(new.team_b);
  update public.reliability_scores
    set scrims_completed = scrims_completed + 1, updated_at = now()
    where team_id in (new.team_a, new.team_b);

  -- community standing: a played scrim is light presence credit (+2)
  update public.community_standing
    set points = points + 2, updated_at = now()
    where team_id in (new.team_a, new.team_b);

  return new;
end $$;

drop trigger if exists trg_apply_match_result on public.scrim_matches;
create trigger trg_apply_match_result
  after insert or update of status on public.scrim_matches
  for each row execute function public.apply_match_result();

-- Reliability score is a pure function of its counters — recompute on every write.
-- A clean team sits at exactly 100; each no-show costs 8, each mid-series quit 4.
-- No "heal" term, so the score stays an honest, legible read of the flake record.
create or replace function public.recompute_reliability_score()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.score := greatest(0, least(100,
    100 - (new.no_shows * 8) - (new.early_quits * 4)
  ));
  return new;
end $$;

drop trigger if exists trg_recompute_reliability on public.reliability_scores;
create trigger trg_recompute_reliability before insert or update on public.reliability_scores
  for each row execute function public.recompute_reliability_score();

-- Handler-facing RPC: flag the opposing team for a no-show on a cancelled/booked match.
create or replace function public.report_no_show(p_match uuid, p_offender uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare m record;
begin
  select * into m from public.scrim_matches where id = p_match;
  if m is null then raise exception 'match not found'; end if;
  if not exists (
    select 1 from public.teams t
    where t.id in (m.team_a, m.team_b) and t.handler_id = auth.uid()
  ) then
    raise exception 'only a handler of either team can report';
  end if;
  if p_offender not in (m.team_a, m.team_b) then
    raise exception 'offender is not in this match';
  end if;
  perform public.ensure_team_reliability(p_offender);
  update public.reliability_scores set no_shows = no_shows + 1, updated_at = now()
    where team_id = p_offender;
  update public.scrim_matches set status = 'cancelled', updated_at = now()
    where id = p_match and status in ('booked','reported','disputed');
end $$;

-- ===========================================================================
-- 5 · head_to_head — derived record between any two teams in a game
-- ===========================================================================
create or replace view public.head_to_head
with (security_invoker = true) as
select
  game_id,
  least(team_a, team_b)                                                as team_lo,
  greatest(team_a, team_b)                                             as team_hi,
  count(*)                                                             as played,
  count(*) filter (where winner = least(team_a, team_b))              as lo_wins,
  count(*) filter (where winner = greatest(team_a, team_b))           as hi_wins,
  max(scheduled_at)                                                    as last_played
from public.scrim_matches
where status = 'confirmed' and winner is not null
group by game_id, least(team_a, team_b), greatest(team_a, team_b);

-- ===========================================================================
-- 6 · rank fast-track for trusted submitters
-- ===========================================================================
create or replace function public.fast_track_trusted_submission()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = new.profile_id and p.trusted_submitter = true
  ) then
    new.status      := 'approved';
    new.review_reason := 'Auto-approved · trusted submitter';
    new.reviewed_at := now();
    update public.game_profiles
      set verification_status = 'verified',
          claimed_rank        = new.claimed_rank,
          rank_label          = coalesce(rank_label, null),
          updated_at          = now()
      where id = new.game_profile_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_fast_track_trusted on public.rank_submissions;
create trigger trg_fast_track_trusted before insert on public.rank_submissions
  for each row execute function public.fast_track_trusted_submission();

-- ===========================================================================
-- 7 · per-game rank form fields — give 'peak' / 'mode' real options
-- ===========================================================================
update public.games set form_fields =
  '[{"key":"tier","label":"Current Rank","type":"select"},{"key":"rr","label":"Rank Rating (RR)","type":"number"},{"key":"peak","label":"Peak Rank","type":"select","options":["Diamond","Ascendant","Immortal","Radiant"]},{"key":"region","label":"Region","type":"text"}]'::jsonb
  where id = 'valorant';

update public.games set form_fields =
  '[{"key":"tier","label":"Rank","type":"select"},{"key":"mode","label":"Mode","type":"select","options":["MP","BR"]},{"key":"credits","label":"Ranked Credits","type":"number"}]'::jsonb
  where id = 'codm';

-- ===========================================================================
-- 8 · light demo data — orgs + one confirmed match so ratings / h2h have life
-- ===========================================================================
insert into public.orgs (id, slug, name, short_name, kind, region, bio, verified)
select md5('tambayan:org:' || v.slug)::uuid, v.slug, v.name, v.short_name, v.kind, v.region, v.bio, true
from (values
  ('up-esports',   'UP Esports Varsity',        'UP Esports',   'varsity',           'NCR',
   'The varsity esports program of the University of the Philippines. Fields rosters across all four titles.'),
  ('mapua-cardinals','Mapúa Cardinals Esports',  'Cardinals',    'varsity',           'NCR',
   'Mapúa University''s competitive esports org. Back-to-back collegiate Valorant finalists.'),
  ('tambayan-league','TAMBAYAN Collegiate League','TCL',         'collegiate_league', 'Nationwide',
   'The open collegiate ladder that runs on TAMBAYAN. Seasonal, cross-region, onsite finals.')
) as v(slug, name, short_name, kind, region, bio)
where not exists (select 1 from public.orgs o where o.slug = v.slug);

-- link the two demo UP / Mapúa teams to their orgs
update public.teams t set org_id = o.id
  from public.orgs o
  where o.slug = 'up-esports' and t.name like 'UP %' and t.org_id is null;
update public.teams t set org_id = o.id
  from public.orgs o
  where o.slug = 'mapua-cardinals' and t.name like 'Mapua %' and t.org_id is null;

-- Confirm one demo match (UP vs DLSU, MLBB) so the Elo trigger has run once.
do $$
declare
  a uuid := md5('tambayan:team:UP Fighting Maroons Esports:mlbb')::uuid;
  b uuid := md5('tambayan:team:DLSU Green Gaming:mlbb')::uuid;
  m uuid := md5('tambayan:match:demo-confirmed:mlbb')::uuid;
begin
  if not exists (select 1 from public.scrim_matches where id = m) then
    insert into public.scrim_matches
      (id, game_id, team_a, team_b, scheduled_at, format, ruleset, status,
       score_a, score_b, team_a_confirmed, team_b_confirmed, winner)
    values
      (m, 'mlbb', a, b, now() - interval '2 days', 'BO3',
       jsonb_build_object('mode','competitive','server','PH','series','BO3'),
       'confirmed', 2, 1, true, true, a);
  end if;
end $$;
