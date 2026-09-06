-- TAMBAYAN — core schema (milestone 1)
-- PH collegiate esports scrim network. Everything competitive is scoped to game_id.
-- Idempotent: safe to re-run (Supabase GitHub integration may re-apply).

-- ---------------------------------------------------------------------------
-- extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- defer function-body validation: is_admin() references profiles before it exists
set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'admin' = any(p.roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- reference: games (config-driven — a 5th game is a row insert)
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id          text primary key,              -- 'mlbb' | 'valorant' | 'dota' | 'codm'
  name        text not null,
  short_name  text not null,
  hue_token   text not null,                 -- css var name, e.g. '--game-mlbb'
  rank_tiers  jsonb not null default '[]',   -- ordered array of tier labels
  form_fields jsonb not null default '[]',   -- per-game rank-submission field config
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reference: schools
-- ---------------------------------------------------------------------------
create table if not exists public.schools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text,
  region        text,
  email_domains text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text unique,
  display_name    text,
  roles           text[] not null default '{player}'
                    check (roles <@ '{player,handler,admin}' and array_length(roles,1) >= 1),
  school_id       uuid references public.schools(id) on delete set null,
  school_verified boolean not null default false,
  region          text,
  avatar_url      text,
  exam_mode       boolean not null default false,   -- exam-week status: pauses listings, no reliability hit
  exam_mode_until date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- game_profiles (user + game)
-- ---------------------------------------------------------------------------
create table if not exists public.game_profiles (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  game_id             text not null references public.games(id),
  claimed_rank        jsonb not null default '{}',
  rank_label          text,
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified','pending','verified','rejected')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (profile_id, game_id)
);
drop trigger if exists trg_game_profiles_updated on public.game_profiles;
create trigger trg_game_profiles_updated before update on public.game_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rank_submissions (manual verification queue)
-- ---------------------------------------------------------------------------
create table if not exists public.rank_submissions (
  id              uuid primary key default gen_random_uuid(),
  game_profile_id uuid not null references public.game_profiles(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  game_id         text not null references public.games(id),
  claimed_rank    jsonb not null default '{}',
  screenshot_path text,                       -- Supabase Storage object path
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  reviewer_id     uuid references public.profiles(id) on delete set null,
  review_reason   text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- teams (game-scoped) + roster
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  tag        text,
  game_id    text not null references public.games(id),
  school_id  uuid references public.schools(id) on delete set null,
  handler_id uuid references public.profiles(id) on delete set null,
  region     text,
  logo_url   text,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_teams_updated on public.teams;
create trigger trg_teams_updated before update on public.teams
  for each row execute function public.set_updated_at();

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'starter'
                check (role in ('captain','starter','substitute','coach','manager')),
  jersey_name text,
  joined_at   timestamptz not null default now(),
  unique (team_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- scrim_listings (structured availability, not free text)
-- ---------------------------------------------------------------------------
create table if not exists public.scrim_listings (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  game_id          text not null references public.games(id),
  posted_by        uuid references public.profiles(id) on delete set null,
  starts_at        timestamptz,
  ends_at          timestamptz,
  window_label     text,                      -- display, e.g. 'Tonight 8:00-11:00 PM'
  format           text not null default 'BO3'
                     check (format in ('BO1','BO2','BO3','BO5','SCRIM_BLOCK')),
  ruleset          jsonb not null default '{}',  -- maps, mode, server
  rank_min         text,
  rank_max         text,
  rank_band_label  text,
  status           text not null default 'open'
                     check (status in ('open','matched','cancelled','expired')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_scrim_listings_updated on public.scrim_listings;
create trigger trg_scrim_listings_updated before update on public.scrim_listings
  for each row execute function public.set_updated_at();
create index if not exists idx_scrim_listings_game_status on public.scrim_listings(game_id, status);

-- ---------------------------------------------------------------------------
-- scrim_matches (booked scrims, dual confirmation)
-- ---------------------------------------------------------------------------
create table if not exists public.scrim_matches (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid references public.scrim_listings(id) on delete set null,
  game_id          text not null references public.games(id),
  team_a           uuid not null references public.teams(id) on delete cascade,
  team_b           uuid not null references public.teams(id) on delete cascade,
  scheduled_at     timestamptz,
  format           text not null default 'BO3',
  ruleset          jsonb not null default '{}',
  status           text not null default 'booked'
                     check (status in ('booked','reported','confirmed','disputed','cancelled')),
  score_a          int,
  score_b          int,
  team_a_confirmed boolean not null default false,
  team_b_confirmed boolean not null default false,
  reported_by      uuid references public.profiles(id) on delete set null,
  winner           uuid references public.teams(id) on delete set null,
  vod_url          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_scrim_matches_updated on public.scrim_matches;
create trigger trg_scrim_matches_updated before update on public.scrim_matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ratings (per team OR per player, per game) — exactly one subject
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id              uuid primary key default gen_random_uuid(),
  game_id         text not null references public.games(id),
  team_id         uuid references public.teams(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete cascade,
  rating          numeric not null default 1500,
  matches_played  int not null default 0,
  wins            int not null default 0,
  losses          int not null default 0,
  seeded_from_rank text,
  updated_at      timestamptz not null default now(),
  constraint ratings_one_subject check ((team_id is not null) <> (profile_id is not null))
);
create unique index if not exists uq_ratings_team on public.ratings(game_id, team_id) where team_id is not null;
create unique index if not exists uq_ratings_profile on public.ratings(game_id, profile_id) where profile_id is not null;

-- ---------------------------------------------------------------------------
-- reliability_scores (no-shows / early quits) — exactly one subject
-- ---------------------------------------------------------------------------
create table if not exists public.reliability_scores (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid references public.teams(id) on delete cascade,
  profile_id       uuid references public.profiles(id) on delete cascade,
  score            numeric not null default 100,
  scrims_completed int not null default 0,
  no_shows         int not null default 0,
  early_quits      int not null default 0,
  updated_at       timestamptz not null default now(),
  constraint reliability_one_subject check ((team_id is not null) <> (profile_id is not null))
);
create unique index if not exists uq_reliability_team on public.reliability_scores(team_id) where team_id is not null;
create unique index if not exists uq_reliability_profile on public.reliability_scores(profile_id) where profile_id is not null;

-- ---------------------------------------------------------------------------
-- community_standing (balance pillar — second axis, reward presence)
-- ---------------------------------------------------------------------------
create table if not exists public.community_standing (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid references public.teams(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete cascade,
  points          int not null default 0,
  events_attended int not null default 0,
  events_hosted   int not null default 0,
  updated_at      timestamptz not null default now(),
  constraint standing_one_subject check ((team_id is not null) <> (profile_id is not null))
);
create unique index if not exists uq_standing_team on public.community_standing(team_id) where team_id is not null;
create unique index if not exists uq_standing_profile on public.community_standing(profile_id) where profile_id is not null;

-- ---------------------------------------------------------------------------
-- events (online tournament OR physical meetup — equal-weight content)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  game_id         text references public.games(id),   -- null = cross-game
  kind            text not null
                    check (kind in ('lan','watch_party','bootcamp','tournament_online','tournament_onsite','meetup','hybrid_finals')),
  is_physical     boolean not null default false,
  host_profile_id uuid references public.profiles(id) on delete set null,
  host_org        text,
  school_id       uuid references public.schools(id) on delete set null,
  region          text,
  venue           text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  capacity        int,
  checkin_code    text,                               -- QR check-in
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();

create table if not exists public.event_rsvps (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'going'
                  check (status in ('going','interested','waitlist','cancelled')),
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (event_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- announcements (game-scoped or platform-wide)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  game_id    text references public.games(id),        -- null = platform-wide
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- free_agent_posts (stretch, cheap — players seeking teams / teams seeking a 5th)
-- ---------------------------------------------------------------------------
create table if not exists public.free_agent_posts (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  game_id      text not null references public.games(id),
  looking_for  text not null check (looking_for in ('team','player')),
  team_id      uuid references public.teams(id) on delete cascade,
  rank_label   text,
  roles_wanted text[] not null default '{}',
  blurb        text,
  status       text not null default 'open' check (status in ('open','closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_free_agent_updated on public.free_agent_posts;
create trigger trg_free_agent_updated before update on public.free_agent_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- mentorship_requests (stretch — ties to "nurture the next generation")
-- ---------------------------------------------------------------------------
create table if not exists public.mentorship_requests (
  id         uuid primary key default gen_random_uuid(),
  mentee_id  uuid not null references public.profiles(id) on delete cascade,
  mentor_id  uuid references public.profiles(id) on delete set null,
  game_id    text references public.games(id),
  kind       text not null default 'general'
               check (kind in ('vod_review','coaching_session','general')),
  status     text not null default 'open'
               check (status in ('open','matched','completed','cancelled')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_mentorship_updated on public.mentorship_requests;
create trigger trg_mentorship_updated before update on public.mentorship_requests
  for each row execute function public.set_updated_at();
