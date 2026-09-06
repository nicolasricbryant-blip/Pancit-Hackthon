-- ===========================================================================
-- TAMBAYAN — Teams feature: extra SQL the app needs but cannot apply itself.
-- Run this against the live Supabase project (SQL editor / migration).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS: let a team handler seed their new team's baseline stat rows.
--
-- Base schema (20260906010002_rls.sql) grants ONLY SELECT on ratings /
-- reliability_scores / community_standing — it assumed those rows are written
-- by a service-role job. `/teams/new` needs the creating handler to insert the
-- three baseline rows (rating 1500, reliability 100, standing 0) for the team
-- they just created. Without these policies the team + captain row are still
-- created, and the profile page falls back to the same baseline values, but the
-- rows are absent from the DB.
-- ---------------------------------------------------------------------------

drop policy if exists ratings_team_handler_insert on public.ratings;
create policy ratings_team_handler_insert on public.ratings for insert
  with check (
    team_id is not null
    and exists (
      select 1 from public.teams t
      where t.id = ratings.team_id and t.handler_id = auth.uid()
    )
  );

drop policy if exists reliability_team_handler_insert on public.reliability_scores;
create policy reliability_team_handler_insert on public.reliability_scores for insert
  with check (
    team_id is not null
    and exists (
      select 1 from public.teams t
      where t.id = reliability_scores.team_id and t.handler_id = auth.uid()
    )
  );

drop policy if exists standing_team_handler_insert on public.community_standing;
create policy standing_team_handler_insert on public.community_standing for insert
  with check (
    team_id is not null
    and exists (
      select 1 from public.teams t
      where t.id = community_standing.team_id and t.handler_id = auth.uid()
    )
  );

-- Existing base policies already cover the rest of the feature:
--   teams_insert_handler        — INSERT teams with check (auth.uid() = handler_id)
--   teams_update_handler        — UPDATE teams for the handler
--   team_members_handler_write  — ALL on team_members for the team's handler
--   *_read                      — public SELECT on every table above

-- ===========================================================================
-- 2. Demo helpers (run once real auth users exist — Confirm-email is ON, so
--    there is no seeded auth user to attach yet).
-- ===========================================================================

-- (a) Make a given profile the handler of a demo team.
--     Replace the handle and team name as needed.
--
-- update public.teams t
-- set handler_id = p.id
-- from public.profiles p
-- where p.handle = 'your_handle'
--   and t.name   = 'UP Fighting Maroons Esports';

-- After this, that user also needs a captain roster row (the app creates this
-- automatically only via /teams/new):
--
-- insert into public.team_members (team_id, profile_id, role, jersey_name)
-- select t.id, p.id, 'captain', 'Cap'
-- from public.teams t, public.profiles p
-- where t.name = 'UP Fighting Maroons Esports' and p.handle = 'your_handle'
-- on conflict (team_id, profile_id) do update set role = 'captain';

-- (b) Add a couple more demo roster members to that team.
--
-- insert into public.team_members (team_id, profile_id, role, jersey_name)
-- select t.id, p.id, v.role, v.jersey
-- from public.teams t
-- join (values
--   ('teammate_handle_1', 'starter',    'Mid'),
--   ('teammate_handle_2', 'substitute', 'Sub1')
-- ) as v(handle, role, jersey) on true
-- join public.profiles p on p.handle = v.handle
-- where t.name = 'UP Fighting Maroons Esports'
-- on conflict (team_id, profile_id) do nothing;
