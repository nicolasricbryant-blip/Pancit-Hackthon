-- TAMBAYAN — mirror team community standing onto players (Player leaderboard
-- Standing column).
--
-- Same gap as the rating mirror in 20260910010015: apply_match_result() and
-- advance_bracket_match() credit the TEAM's community_standing.points on a
-- confirmed match, but nothing ever copies that onto profile_id rows, so
-- getPlayerRows()'s `community_standing` join always renders "—". This adds
-- an ensure_team_standing() helper (matching ensure_team_rating /
-- ensure_team_reliability — a team created outside the demo seed has no
-- community_standing row yet) and the same current-roster mirror already
-- used for ratings. Idempotent.

create or replace function public.ensure_team_standing(p_team uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.community_standing where team_id = p_team) then
    insert into public.community_standing (team_id, points) values (p_team, 0);
  end if;
end $$;

-- ===========================================================================
-- apply_match_result — confirmed scrim trigger
-- ===========================================================================
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
  perform public.ensure_team_standing(new.team_a);
  perform public.ensure_team_standing(new.team_b);
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

  -- mirror team standing onto its current roster, same heuristic
  insert into public.community_standing (profile_id, points)
  select m.profile_id, s.points
  from public.team_members m
  join public.community_standing s on s.team_id = m.team_id
  where m.team_id in (new.team_a, new.team_b)
  on conflict (profile_id) where profile_id is not null
  do update set points = excluded.points, updated_at = now();

  return new;
end $$;

-- ===========================================================================
-- advance_bracket_match — host reports a bracket result
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
  perform public.ensure_team_standing(bm.team_a);
  perform public.ensure_team_standing(bm.team_b);
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

  -- mirror team standing onto its current roster, same heuristic
  insert into public.community_standing (profile_id, points)
  select m.profile_id, s.points
  from public.team_members m
  join public.community_standing s on s.team_id = m.team_id
  where m.team_id in (bm.team_a, bm.team_b)
  on conflict (profile_id) where profile_id is not null
  do update set points = excluded.points, updated_at = now();
end $$;
