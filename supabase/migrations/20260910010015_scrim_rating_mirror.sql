-- TAMBAYAN — mirror scrim results onto player ratings (closes the Elo gap
-- for the Player leaderboard).
--
-- advance_bracket_match() already mirrors a confirmed bracket result onto
-- every current roster member's (game_id, profile_id) row in `ratings` —
-- the MVP heuristic "a player's rating tracks their team's rating in that
-- game". Scrims are the primary match type and never got the same mirror,
-- so the Player board stayed empty outside of bracket play (or a manual
-- seed). This extends apply_match_result() — the confirmed-scrim trigger —
-- with the identical mirror step. Idempotent (create or replace).

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

  -- mirror team rating onto its current roster so the PLAYER leaderboard
  -- fills (same heuristic as advance_bracket_match: a player's rating
  -- tracks their team's rating in that game).
  insert into public.ratings (game_id, profile_id, rating)
  select new.game_id, m.profile_id, r.rating
  from public.team_members m
  join public.ratings r on r.team_id = m.team_id and r.game_id = new.game_id
  where m.team_id in (new.team_a, new.team_b)
  on conflict (game_id, profile_id) where profile_id is not null
  do update set rating = excluded.rating, updated_at = now();

  return new;
end $$;
