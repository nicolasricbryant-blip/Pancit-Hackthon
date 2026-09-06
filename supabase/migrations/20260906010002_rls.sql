-- TAMBAYAN — row-level security (milestone 1)
-- Platform is a discovery tool: listings/teams/leaderboards/events are public read.
-- Writes gated to the owning profile / team handler. rank_submissions are private.
-- Idempotent: policies dropped before create.

-- enable RLS everywhere
alter table public.games              enable row level security;
alter table public.schools            enable row level security;
alter table public.profiles           enable row level security;
alter table public.game_profiles      enable row level security;
alter table public.rank_submissions   enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.scrim_listings     enable row level security;
alter table public.scrim_matches      enable row level security;
alter table public.ratings            enable row level security;
alter table public.reliability_scores enable row level security;
alter table public.community_standing enable row level security;
alter table public.events             enable row level security;
alter table public.event_rsvps        enable row level security;
alter table public.announcements      enable row level security;
alter table public.free_agent_posts   enable row level security;
alter table public.mentorship_requests enable row level security;

-- ---------------------------------------------------------------------------
-- reference tables: public read, admin write
-- ---------------------------------------------------------------------------
drop policy if exists games_read on public.games;
create policy games_read on public.games for select using (true);
drop policy if exists games_admin_write on public.games;
create policy games_admin_write on public.games for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists schools_read on public.schools;
create policy schools_read on public.schools for select using (true);
drop policy if exists schools_admin_write on public.schools;
create policy schools_admin_write on public.schools for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles: public read, self update, self insert
-- ---------------------------------------------------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- game_profiles: public read, owner write
-- ---------------------------------------------------------------------------
drop policy if exists game_profiles_read on public.game_profiles;
create policy game_profiles_read on public.game_profiles for select using (true);
drop policy if exists game_profiles_owner_write on public.game_profiles;
create policy game_profiles_owner_write on public.game_profiles for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- rank_submissions: owner reads own + admin reads all; owner inserts; admin reviews
-- ---------------------------------------------------------------------------
drop policy if exists rank_sub_read on public.rank_submissions;
create policy rank_sub_read on public.rank_submissions for select
  using (auth.uid() = profile_id or public.is_admin());
drop policy if exists rank_sub_insert_self on public.rank_submissions;
create policy rank_sub_insert_self on public.rank_submissions for insert
  with check (auth.uid() = profile_id);
drop policy if exists rank_sub_admin_update on public.rank_submissions;
create policy rank_sub_admin_update on public.rank_submissions for update
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- teams: public read, handler manages own team
-- ---------------------------------------------------------------------------
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (true);
drop policy if exists teams_insert_handler on public.teams;
create policy teams_insert_handler on public.teams for insert with check (auth.uid() = handler_id);
drop policy if exists teams_update_handler on public.teams;
create policy teams_update_handler on public.teams for update
  using (auth.uid() = handler_id) with check (auth.uid() = handler_id);
drop policy if exists teams_delete_handler on public.teams;
create policy teams_delete_handler on public.teams for delete using (auth.uid() = handler_id);

-- team_members: public read; team handler manages roster
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select using (true);
drop policy if exists team_members_handler_write on public.team_members;
create policy team_members_handler_write on public.team_members for all
  using (exists (select 1 from public.teams t where t.id = team_id and t.handler_id = auth.uid()))
  with check (exists (select 1 from public.teams t where t.id = team_id and t.handler_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- scrim_listings: public read; team handler writes
-- ---------------------------------------------------------------------------
drop policy if exists scrim_listings_read on public.scrim_listings;
create policy scrim_listings_read on public.scrim_listings for select using (true);
drop policy if exists scrim_listings_handler_write on public.scrim_listings;
create policy scrim_listings_handler_write on public.scrim_listings for all
  using (exists (select 1 from public.teams t where t.id = team_id and t.handler_id = auth.uid()))
  with check (exists (select 1 from public.teams t where t.id = team_id and t.handler_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- scrim_matches: public read; handler of either team writes
-- ---------------------------------------------------------------------------
drop policy if exists scrim_matches_read on public.scrim_matches;
create policy scrim_matches_read on public.scrim_matches for select using (true);
drop policy if exists scrim_matches_handler_write on public.scrim_matches;
create policy scrim_matches_handler_write on public.scrim_matches for all
  using (exists (select 1 from public.teams t where t.id in (team_a, team_b) and t.handler_id = auth.uid()))
  with check (exists (select 1 from public.teams t where t.id in (team_a, team_b) and t.handler_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- ratings / reliability / community_standing: public read; system-managed writes
-- (writes happen via service role in edge functions / triggers — no anon policy)
-- ---------------------------------------------------------------------------
drop policy if exists ratings_read on public.ratings;
create policy ratings_read on public.ratings for select using (true);
drop policy if exists reliability_read on public.reliability_scores;
create policy reliability_read on public.reliability_scores for select using (true);
drop policy if exists standing_read on public.community_standing;
create policy standing_read on public.community_standing for select using (true);

-- ---------------------------------------------------------------------------
-- events: public read; host manages own event
-- ---------------------------------------------------------------------------
drop policy if exists events_read on public.events;
create policy events_read on public.events for select using (true);
drop policy if exists events_insert_host on public.events;
create policy events_insert_host on public.events for insert with check (auth.uid() = host_profile_id);
drop policy if exists events_update_host on public.events;
create policy events_update_host on public.events for update
  using (auth.uid() = host_profile_id or public.is_admin())
  with check (auth.uid() = host_profile_id or public.is_admin());

-- event_rsvps: public read (counts); attendee manages own RSVP
drop policy if exists event_rsvps_read on public.event_rsvps;
create policy event_rsvps_read on public.event_rsvps for select using (true);
drop policy if exists event_rsvps_owner_write on public.event_rsvps;
create policy event_rsvps_owner_write on public.event_rsvps for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- announcements: public read; author or admin writes
-- ---------------------------------------------------------------------------
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select using (true);
drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements for all
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- free_agent_posts: public read; owner writes
-- ---------------------------------------------------------------------------
drop policy if exists free_agent_read on public.free_agent_posts;
create policy free_agent_read on public.free_agent_posts for select using (true);
drop policy if exists free_agent_owner_write on public.free_agent_posts;
create policy free_agent_owner_write on public.free_agent_posts for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- mentorship_requests: mentee + mentor + admin read; mentee writes; mentor accepts
-- ---------------------------------------------------------------------------
drop policy if exists mentorship_read on public.mentorship_requests;
create policy mentorship_read on public.mentorship_requests for select
  using (auth.uid() = mentee_id or auth.uid() = mentor_id or public.is_admin());
drop policy if exists mentorship_insert_mentee on public.mentorship_requests;
create policy mentorship_insert_mentee on public.mentorship_requests for insert
  with check (auth.uid() = mentee_id);
drop policy if exists mentorship_update_party on public.mentorship_requests;
create policy mentorship_update_party on public.mentorship_requests for update
  using (auth.uid() = mentee_id or auth.uid() = mentor_id)
  with check (auth.uid() = mentee_id or auth.uid() = mentor_id);
