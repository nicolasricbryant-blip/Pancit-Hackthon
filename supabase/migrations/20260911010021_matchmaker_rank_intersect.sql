-- TAMBAYAN — matchmaker: honour BOTH sides' rank preference, and stop
-- overcounting how many players it actually added. Idempotent.
--
-- 5b. lobby_rank_ok silently discards the player's own rank preference.
-- run_lobby_matchmaker called
--   lobby_rank_ok(game, rank, coalesce(lobby.min, pref.min), coalesce(lobby.max, pref.max))
-- — when the LOBBY has a bound, the PLAYER's own auto-join rank preference is
-- ignored outright, not just deferred to. A player who set "Mythic–Mythic"
-- gets matched into a Warrior lobby with no rank range of its own overriding
-- theirs. Both sides stated a constraint; only one was ever honoured.
--
-- Fix: a new lobby_rank_intersect_ok() takes both ranges and checks the
-- candidate's rank against their INTERSECTION — the tighter min (the greater
-- tier index) and the tighter max (the lesser tier index) — using the same
-- games.rank_tiers ordering lobby_rank_ok already relies on.
-- greatest()/least() ignore a null (unbounded) side and only return null when
-- BOTH sides are unbounded, which is exactly the semantics an open-ended
-- min/max needs. When the intersection is empty (tighter min's index >
-- tighter max's index), no rank index can satisfy both
-- "r >= lo" and "r <= hi" at once, so the existing range-check shape already
-- returns false for every candidate with no extra empty-range branch needed
-- — the player simply doesn't match, which is correct. lobby_rank_ok() itself
-- is untouched (still a valid single-range primitive); this only changes
-- what run_lobby_matchmaker calls.
--
-- 5c. run_lobby_matchmaker overcounts. `v_added := v_added + 1` ran
-- unconditionally after an insert with `on conflict (lobby_id, profile_id) do
-- nothing`, so a skipped insert (the pair already existed — a real race, not
-- just theoretical, since this function is invoked from multiple triggers)
-- still counted as an add. Use `get diagnostics ... row_count` so the
-- returned count — enable_autojoin() reads it to decide whether to report
-- "Matched into a lobby" — reflects rows actually inserted.

create or replace function public.lobby_rank_intersect_ok(
  p_game text, p_rank text,
  p_min_a text, p_max_a text,
  p_min_b text, p_max_b text
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  with tiers as (
    select array(select jsonb_array_elements_text(rank_tiers)) as arr
    from public.games where id = p_game
  ),
  ix as (
    select
      array_position((select arr from tiers), p_rank)  as r,
      array_position((select arr from tiers), p_min_a) as lo_a,
      array_position((select arr from tiers), p_max_a) as hi_a,
      array_position((select arr from tiers), p_min_b) as lo_b,
      array_position((select arr from tiers), p_max_b) as hi_b
  ),
  bounds as (
    select
      greatest((select lo_a from ix), (select lo_b from ix)) as lo,
      least   ((select hi_a from ix), (select hi_b from ix)) as hi
  )
  select
    p_rank is null
    or (select r from ix) is null
    or (
      ((select lo from bounds) is null or (select r from ix) >= (select lo from bounds))
      and
      ((select hi from bounds) is null or (select r from ix) <= (select hi from bounds))
    );
$$;
grant execute on function public.lobby_rank_intersect_ok(text, text, text, text, text, text)
  to authenticated, anon;

create or replace function public.run_lobby_matchmaker(p_lobby uuid)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_l        public.lobbies%rowtype;
  v_active   int;
  v_pending  int;
  v_open     int;
  v_added    int := 0;
  v_hit      int;
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
      and public.lobby_rank_intersect_ok(
            v_l.game_id, gp.rank_label,
            v_l.rank_min, v_l.rank_max,
            pr.rank_min, pr.rank_max)
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
    get diagnostics v_hit = row_count;
    v_added := v_added + v_hit;
  end loop;

  return v_added;
end $$;
