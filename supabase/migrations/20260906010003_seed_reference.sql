-- TAMBAYAN — reference seed data (games + schools). Idempotent.

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
insert into public.games (id, name, short_name, hue_token, sort_order, rank_tiers, form_fields) values
('mlbb', 'Mobile Legends: Bang Bang', 'MLBB', '--game-mlbb', 1,
 '["Mythic","Mythical Glory","Mythical Honor","Mythical Immortal"]'::jsonb,
 '[{"key":"tier","label":"Tier","type":"select"},{"key":"stars","label":"Stars","type":"number"},{"key":"points","label":"Mythic Points","type":"number"},{"key":"server","label":"Server","type":"text"}]'::jsonb),
('valorant', 'VALORANT', 'Valorant', '--game-valorant', 2,
 '["Diamond","Ascendant","Immortal","Radiant"]'::jsonb,
 '[{"key":"tier","label":"Current Rank","type":"select"},{"key":"rr","label":"Rank Rating (RR)","type":"number"},{"key":"peak","label":"Peak Rank","type":"select"},{"key":"region","label":"Region","type":"text"}]'::jsonb),
('dota', 'Dota 2', 'Dota 2', '--game-dota', 3,
 '["3k MMR","4k MMR","5k MMR","6k+ MMR"]'::jsonb,
 '[{"key":"mmr","label":"MMR","type":"number"},{"key":"medal","label":"Medal","type":"text"},{"key":"leaderboard","label":"Leaderboard # (if ranked)","type":"number"}]'::jsonb),
('codm', 'Call of Duty: Mobile', 'CoDM', '--game-codm', 4,
 '["Pro","Master","Grand Master","Legendary"]'::jsonb,
 '[{"key":"tier","label":"Rank","type":"select"},{"key":"mode","label":"Mode (MP / BR)","type":"select"},{"key":"credits","label":"Ranked Credits","type":"number"}]'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  hue_token = excluded.hue_token,
  sort_order = excluded.sort_order,
  rank_tiers = excluded.rank_tiers,
  form_fields = excluded.form_fields;

-- ---------------------------------------------------------------------------
-- schools (insert-if-absent by name)
-- ---------------------------------------------------------------------------
insert into public.schools (name, short_name, region, email_domains)
select v.name, v.short_name, v.region, v.email_domains
from (values
  ('University of the Philippines Diliman', 'UP Diliman', 'NCR', array['up.edu.ph']),
  ('De La Salle University', 'DLSU', 'NCR', array['dlsu.edu.ph']),
  ('Ateneo de Manila University', 'ADMU', 'NCR', array['ateneo.edu']),
  ('University of Santo Tomas', 'UST', 'NCR', array['ust.edu.ph']),
  ('Mapua University', 'Mapua', 'NCR', array['mapua.edu.ph']),
  ('Far Eastern University', 'FEU', 'NCR', array['feu.edu.ph']),
  ('National University', 'NU', 'NCR', array['nu.edu.ph']),
  ('Adamson University', 'AdU', 'NCR', array['adamson.edu.ph']),
  ('University of the Philippines Cebu', 'UP Cebu', 'Central Visayas', array['up.edu.ph']),
  ('University of Science and Technology of Southern Philippines', 'USTP', 'Northern Mindanao', array['ustp.edu.ph']),
  ('Silliman University', 'Silliman', 'Central Visayas', array['su.edu.ph']),
  ('Batangas State University', 'BatState U', 'CALABARZON', array['g.batstate-u.edu.ph'])
) as v(name, short_name, region, email_domains)
where not exists (select 1 from public.schools s where s.name = v.name);
