-- TAMBAYAN — demo dataset (teams, ratings, reliability, standing, open scrim
-- listings, events, announcements). Mirrors src/features/scrims/seed.ts so the
-- Scrim Finder reads identically whether on mock or live data.
-- Fully idempotent: every id is derived from a stable string.
-- No auth users required — all profile FKs (handler_id, posted_by, host) left null.

do $$
declare
  r record;
  v_team_id uuid;
  v_school_id uuid;
begin
  for r in
    select * from (values
      -- name, tag, game, school_short, region, rating, reliability, standing, window_label, format, rank_min, rank_max, rank_band_label
      ('UP Fighting Maroons Esports','UP',  'mlbb','UP Diliman','NCR',1988,96,120,'Tonight 8:00-11:00 PM','BO3','Mythical Glory','Mythical Honor','Mythical Glory-Mythical Honor'),
      ('DLSU Green Gaming','DLSU',           'mlbb','DLSU','NCR',1902,91, 90,'Tonight 9:00 PM-12:00 AM','BO5','Mythical Honor','Mythical Honor','Mythical Honor'),
      ('Ateneo Blue Spark','ADMU',           'mlbb','ADMU','NCR',1740,84, 60,'This week - Wed-Fri evenings','SCRIM_BLOCK','Mythic','Mythical Glory','Mythic-Mythical Glory'),
      ('UST Growling Tigers Esports','UST',  'mlbb','UST','NCR',1663,78, 45,'Weekend - Sat 2:00-6:00 PM','BO2','Mythic','Mythic','Mythic'),
      ('Mapua Cardinals VCT','MCL',          'valorant','Mapua','NCR',2044,97,140,'Tonight 7:30-10:30 PM','BO3','Immortal','Radiant','Immortal-Radiant'),
      ('FEU Tamaraws Tactical','FEU',        'valorant','FEU','NCR',1815,88, 70,'This week - Tue/Thu 8:00 PM','BO1','Ascendant','Immortal','Ascendant-Immortal'),
      ('NU Bulldogs Valorant','NU',          'valorant','NU','NCR',1590,73, 30,'Weekend - Sun 1:00-5:00 PM','SCRIM_BLOCK','Ascendant','Ascendant','Ascendant'),
      ('Adamson Soaring Falcons','AdU',      'valorant','AdU','NCR',1452,81, 50,'Tonight 10:00 PM-1:00 AM','BO2','Diamond','Ascendant','Diamond-Ascendant'),
      ('UP Cebu Warriors Dota','UPC',        'dota','UP Cebu','Central Visayas',1930,90, 80,'This week - Mon-Thu 9:00 PM','BO3','5k MMR','6k+ MMR','5k-6k+ MMR'),
      ('USTP Cyclones','USTP',               'dota','USTP','Northern Mindanao',1706,85, 65,'Weekend - Sat 7:00-11:00 PM','BO5','4k MMR','5k MMR','4k-5k MMR'),
      ('Silliman Stallions Esports','SU',    'dota','Silliman','Central Visayas',1497,76, 40,'Tonight 8:30-11:30 PM','BO1','4k MMR','4k MMR','4k MMR'),
      ('Batangas State Red Spartans','BatSU','codm','BatState U','CALABARZON',2071,99,155,'Tonight 9:00 PM-12:00 AM','BO5','Grand Master','Legendary','Grand Master-Legendary'),
      ('FEU Tamaraws Mobile','FEU',          'codm','FEU','NCR',1638,79, 55,'This week - Wed/Fri 8:30 PM','BO3','Master','Grand Master','Master-Grand Master'),
      ('NU Bulldogs CoDM','NU',              'codm','NU','NCR',1571,70, 25,'Weekend - Sun 3:00-7:00 PM','SCRIM_BLOCK','Master','Master','Master')
    ) as t(name,tag,game,school_short,region,rating,reliability,standing,window_label,format,rank_min,rank_max,rank_band_label)
  loop
    v_team_id := md5('tambayan:team:' || r.name || ':' || r.game)::uuid;
    select id into v_school_id from public.schools where short_name = r.school_short limit 1;

    insert into public.teams (id, name, tag, game_id, school_id, region)
    values (v_team_id, r.name, r.tag, r.game, v_school_id, r.region)
    on conflict (id) do update set
      name = excluded.name, tag = excluded.tag, game_id = excluded.game_id,
      school_id = excluded.school_id, region = excluded.region;

    insert into public.ratings (id, game_id, team_id, rating, matches_played, wins, losses, seeded_from_rank)
    values (md5('tambayan:rating:' || v_team_id)::uuid, r.game, v_team_id, r.rating,
            20, round(10 + (r.rating - 1400) / 70.0)::int, 20 - round(10 + (r.rating - 1400) / 70.0)::int, r.rank_min)
    on conflict (id) do update set rating = excluded.rating;

    insert into public.reliability_scores (id, team_id, score, scrims_completed, no_shows, early_quits)
    values (md5('tambayan:rel:' || v_team_id)::uuid, v_team_id, r.reliability, 24,
            round((100 - r.reliability) / 12.0)::int, round((100 - r.reliability) / 20.0)::int)
    on conflict (id) do update set score = excluded.score;

    insert into public.community_standing (id, team_id, points, events_attended, events_hosted)
    values (md5('tambayan:cs:' || v_team_id)::uuid, v_team_id, r.standing,
            round(r.standing / 20.0)::int, round(r.standing / 60.0)::int)
    on conflict (id) do update set points = excluded.points;

    insert into public.scrim_listings
      (id, team_id, game_id, window_label, format, rank_min, rank_max, rank_band_label, status,
       ruleset, starts_at, ends_at)
    values (md5('tambayan:listing:' || v_team_id)::uuid, v_team_id, r.game, r.window_label, r.format,
            r.rank_min, r.rank_max, r.rank_band_label, 'open',
            jsonb_build_object('server','PH','mode','competitive'),
            now() + interval '6 hours', now() + interval '9 hours')
    on conflict (id) do update set
      window_label = excluded.window_label, format = excluded.format,
      rank_band_label = excluded.rank_band_label, status = 'open';
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- events (meetups + online — equal weight to scrims)
-- ---------------------------------------------------------------------------
insert into public.events (id, title, game_id, kind, is_physical, host_org, region, venue, starts_at, ends_at, capacity, checkin_code, description)
select
  md5('tambayan:event:' || e.title)::uuid, e.title, e.game_id, e.kind, e.is_physical,
  e.host_org, e.region, e.venue, e.starts_at, e.ends_at, e.capacity, e.checkin_code, e.description
from (values
  ('Katipunan Campus LAN — MLBB Night','mlbb','lan',true,'ADMU Esports Society','NCR','Ateneo Blue Eagle Gym',
   now() + interval '4 days', now() + interval '4 days 6 hours', 64, 'LAN-KTPN-01',
   'Bring your own phone. 5v5 open bracket, walk-ins welcome, prizes from the org.'),
  ('Valorant Collegiate Watch Party — Grand Finals','valorant','watch_party',true,'Mapua Cardinals','NCR','Mapua Intramuros AVR',
   now() + interval '2 days', now() + interval '2 days 4 hours', 120, 'WP-VCT-FIN',
   'Big-screen watch party for the regional finals. Free entry with a school ID.'),
  ('TAMBAYAN Ladder — Dota 2 Online Qualifier','dota','tournament_online',false,'TAMBAYAN','Nationwide',null,
   now() + interval '6 days', now() + interval '6 days 8 hours', 32, 'LAD-DOTA-Q1',
   'Online BO3 qualifier. Top 4 advance to the onsite finals next month.'),
  ('CoDM Campus Bootcamp','codm','bootcamp',true,'Batangas State Red Spartans','CALABARZON','BatState U Gymnasium',
   now() + interval '9 days', now() + interval '9 days 5 hours', 40, 'BC-CODM-01',
   'Coaching + scrims for first-year players. No rank requirement.'),
  ('Hybrid Finals — TAMBAYAN Season 0','dota','hybrid_finals',true,'TAMBAYAN','Central Visayas','UP Cebu Performing Arts Hall',
   now() + interval '30 days', now() + interval '30 days 9 hours', 200, 'HF-S0-CEBU',
   'Online ladder culminates onsite. Open to spectators, QR check-in at the door.'),
  ('First-Year Meetup — Find Your Team','codm','meetup',true,'National University Esports','NCR','NU MOA Esports Room',
   now() + interval '3 days', now() + interval '3 days 3 hours', 50, 'MU-NU-FY1',
   'Speed-teaming for players with no roster yet. All four games.')
) as e(title,game_id,kind,is_physical,host_org,region,venue,starts_at,ends_at,capacity,checkin_code,description)
where not exists (select 1 from public.events x where x.id = md5('tambayan:event:' || e.title)::uuid);

-- ---------------------------------------------------------------------------
-- announcements (game-scoped + platform-wide)
-- ---------------------------------------------------------------------------
insert into public.announcements (id, game_id, title, body, pinned)
select md5('tambayan:ann:' || a.title)::uuid, a.game_id, a.title, a.body, a.pinned
from (values
  (null::text,'Welcome to TAMBAYAN (beta)','Scrim listings, ratings, and events are live for MLBB, Valorant, Dota 2, and CoDM. Rank verification is human-reviewed — submit a screenshot and a mod approves it.',true),
  ('mlbb','MLBB rank window updated for the new season','Mythic point thresholds shifted. Re-submit your rank if your badge looks stale.',false),
  ('valorant','Valorant scrim etiquette reminder','Lock your agreed ruleset before queue. No-shows affect your team reliability score.',false),
  (null::text,'Exam week? Flag it.','Set exam-week status on your profile and your listings pause with no reliability penalty. Reward presence, never punish study.',false)
) as a(game_id,title,body,pinned)
where not exists (select 1 from public.announcements x where x.id = md5('tambayan:ann:' || a.title)::uuid);
