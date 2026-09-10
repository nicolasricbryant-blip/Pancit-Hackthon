-- TAMBAYAN — player_match_stats: per-player Scrims/Wins/Win-Rate source.
--
-- scrim_matches and bracket_matches are team-scoped only — there is no
-- per-match roster snapshot in the schema. This view approximates a player's
-- record by joining confirmed matches to their CURRENT team_members rows:
-- a player who joins a team today inherits that team's past confirmed
-- matches, and one who leaves loses them. Good enough for a stat tile;
-- not a historical record. Idempotent.

create or replace view public.player_match_stats
with (security_invoker = true) as
with played as (
  select game_id, team_a as team_id, (winner = team_a) as won
  from public.scrim_matches
  where status = 'confirmed' and winner is not null
  union all
  select game_id, team_b as team_id, (winner = team_b) as won
  from public.scrim_matches
  where status = 'confirmed' and winner is not null
  union all
  select t.game_id, bm.team_a as team_id, (bm.winner = bm.team_a) as won
  from public.bracket_matches bm
  join public.tournaments t on t.id = bm.tournament_id
  where bm.status = 'confirmed' and bm.winner is not null and bm.team_a is not null
  union all
  select t.game_id, bm.team_b as team_id, (bm.winner = bm.team_b) as won
  from public.bracket_matches bm
  join public.tournaments t on t.id = bm.tournament_id
  where bm.status = 'confirmed' and bm.winner is not null and bm.team_b is not null
)
select
  tm.profile_id,
  played.game_id,
  count(*)::int as scrims,
  count(*) filter (where played.won)::int as wins,
  (count(*) - count(*) filter (where played.won))::int as losses,
  round(100.0 * count(*) filter (where played.won) / count(*), 1) as win_rate_pct
from played
join public.team_members tm on tm.team_id = played.team_id
group by tm.profile_id, played.game_id;

comment on view public.player_match_stats is
  'Per-player Scrims/Wins/Win-Rate, approximated from CURRENT team_members roster (no per-match roster snapshot exists) against confirmed scrim_matches + confirmed bracket_matches.';
