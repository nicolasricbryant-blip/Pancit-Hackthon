-- TAMBAYAN — RLS deltas required by Wave 2 features. Idempotent.

-- 1 · rank review board: an admin approves/rejects by flipping verification_status
--     on ANOTHER user's game_profiles row. Base policy only allowed the owner.
drop policy if exists game_profiles_admin_write on public.game_profiles;
create policy game_profiles_admin_write on public.game_profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- 2 · team creation: the handler seeds baseline rating / reliability / standing
--     rows for their new team. Base policies were SELECT-only on these tables.
drop policy if exists ratings_team_handler_insert on public.ratings;
create policy ratings_team_handler_insert on public.ratings for insert
  with check (
    team_id is not null
    and exists (select 1 from public.teams t
                where t.id = ratings.team_id and t.handler_id = auth.uid())
  );

drop policy if exists reliability_team_handler_insert on public.reliability_scores;
create policy reliability_team_handler_insert on public.reliability_scores for insert
  with check (
    team_id is not null
    and exists (select 1 from public.teams t
                where t.id = reliability_scores.team_id and t.handler_id = auth.uid())
  );

drop policy if exists standing_team_handler_insert on public.community_standing;
create policy standing_team_handler_insert on public.community_standing for insert
  with check (
    team_id is not null
    and exists (select 1 from public.teams t
                where t.id = community_standing.team_id and t.handler_id = auth.uid())
  );
