-- TAMBAYAN — Match Room demo seed (feature: matches)
-- Adds 4 demo rows to public.scrim_matches between teams already seeded by
-- supabase/migrations/20260906010004_seed_demo.sql. No schema changes: the
-- scrim_matches table + its RLS already exist (core_schema + rls migrations).
--
-- Idempotent: each match id is md5('tambayan:match:' || a_name || ':' || b_name)::uuid
-- with `on conflict (id) do nothing`. Team ids are resolved by (name, game_id)
-- so this stays correct no matter how the demo seed hashes team ids.
--
-- NOTE: the seeded teams have handler_id = NULL, so the handler-gated
-- report -> confirm -> dispute flow CANNOT run until a real profile id is
-- attached to two opposing teams — see the MANUAL TESTING block at the bottom.

do $$
declare
  v_a uuid;
  v_b uuid;
begin
  -- 1 · MLBB — booked, ~2h out, BO3 (use this pair to test the full flow)
  select id into v_a from public.teams where name = 'UP Fighting Maroons Esports' and game_id = 'mlbb';
  select id into v_b from public.teams where name = 'DLSU Green Gaming'            and game_id = 'mlbb';
  if v_a is not null and v_b is not null then
    insert into public.scrim_matches
      (id, game_id, team_a, team_b, scheduled_at, format, ruleset, status,
       score_a, score_b, team_a_confirmed, team_b_confirmed, reported_by, winner)
    values
      (md5('tambayan:match:UP Fighting Maroons Esports:DLSU Green Gaming')::uuid,
       'mlbb', v_a, v_b, now() + interval '2 hours', 'BO3',
       '{"mode":"competitive","maps":["Draft"],"series":"BO3","server":"PH"}'::jsonb,
       'booked', null, null, false, false, null, null)
    on conflict (id) do nothing;
  end if;

  -- 2 · Valorant — reported ~1d ago, 2-1, only team A has confirmed
  select id into v_a from public.teams where name = 'Mapua Cardinals VCT'   and game_id = 'valorant';
  select id into v_b from public.teams where name = 'FEU Tamaraws Tactical' and game_id = 'valorant';
  if v_a is not null and v_b is not null then
    insert into public.scrim_matches
      (id, game_id, team_a, team_b, scheduled_at, format, ruleset, status,
       score_a, score_b, team_a_confirmed, team_b_confirmed, reported_by, winner)
    values
      (md5('tambayan:match:Mapua Cardinals VCT:FEU Tamaraws Tactical')::uuid,
       'valorant', v_a, v_b, now() - interval '1 day', 'BO3',
       '{"mode":"competitive","maps":["Ascent","Haven","Split"],"series":"BO3","server":"PH"}'::jsonb,
       'reported', 2, 1, true, false, null, null)
    on conflict (id) do nothing;
  end if;

  -- 3 · Dota 2 — confirmed ~3d ago, 2-0, winner = team A
  select id into v_a from public.teams where name = 'UP Cebu Warriors Dota' and game_id = 'dota';
  select id into v_b from public.teams where name = 'USTP Cyclones'         and game_id = 'dota';
  if v_a is not null and v_b is not null then
    insert into public.scrim_matches
      (id, game_id, team_a, team_b, scheduled_at, format, ruleset, status,
       score_a, score_b, team_a_confirmed, team_b_confirmed, reported_by, winner)
    values
      (md5('tambayan:match:UP Cebu Warriors Dota:USTP Cyclones')::uuid,
       'dota', v_a, v_b, now() - interval '3 days', 'BO3',
       '{"mode":"captains mode","maps":[],"series":"BO3","server":"PH"}'::jsonb,
       'confirmed', 2, 0, true, true, null, v_a)
    on conflict (id) do nothing;
  end if;

  -- 4 · CoDM — booked, ~26h out, BO5
  select id into v_a from public.teams where name = 'Batangas State Red Spartans' and game_id = 'codm';
  select id into v_b from public.teams where name = 'NU Bulldogs CoDM'            and game_id = 'codm';
  if v_a is not null and v_b is not null then
    insert into public.scrim_matches
      (id, game_id, team_a, team_b, scheduled_at, format, ruleset, status,
       score_a, score_b, team_a_confirmed, team_b_confirmed, reported_by, winner)
    values
      (md5('tambayan:match:Batangas State Red Spartans:NU Bulldogs CoDM')::uuid,
       'codm', v_a, v_b, now() + interval '26 hours', 'BO5',
       '{"mode":"competitive","maps":["Standoff","Raid","Summit","Crash","Firing Range"],"series":"BO5","server":"PH"}'::jsonb,
       'booked', null, null, false, false, null, null)
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- MANUAL TESTING ONLY — the report/confirm/dispute actions are gated to a
-- handler_id of team_a or team_b (RLS: scrim_matches_handler_write, and the
-- server actions re-check the same rule). Point two opposing demo teams at your
-- own profile id, then sign in as that user to exercise the flow.
--
-- Find your id:  select id from public.profiles where handle = '<your_handle>';
--
-- MLBB pair (match #1 is 'booked' — lets you run report -> confirm from scratch):
--   update public.teams set handler_id = '<YOUR_PROFILE_ID>'
--     where name in ('UP Fighting Maroons Esports','DLSU Green Gaming') and game_id = 'mlbb';
--
-- Valorant pair (match #2 is 'reported' — lets you test the confirm / dispute step):
--   update public.teams set handler_id = '<YOUR_PROFILE_ID>'
--     where name in ('Mapua Cardinals VCT','FEU Tamaraws Tactical') and game_id = 'valorant';
--
-- Undo:
--   update public.teams set handler_id = null
--     where name in ('UP Fighting Maroons Esports','DLSU Green Gaming',
--                    'Mapua Cardinals VCT','FEU Tamaraws Tactical');
-- ---------------------------------------------------------------------------
