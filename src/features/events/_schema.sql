-- ============================================================================
-- TAMBAYAN · Events + Meetups + Announcements
-- Reference schema for the `events` feature. The live project already has these
-- tables + seed rows (6 events, 4 announcements); this file documents the shape
-- the feature code assumes and the RLS it relies on. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  game_id           text references public.games (id) on delete set null,   -- null = cross-game
  kind              text not null default 'meetup',                          -- lan | watch_party | bootcamp | tournament_online | tournament_onsite | meetup | hybrid_finals
  is_physical       boolean not null default false,
  host_profile_id   uuid references public.profiles (id) on delete set null,
  host_org          text,
  school_id         uuid references public.schools (id) on delete set null,
  region            text,
  venue             text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  capacity          integer check (capacity is null or capacity > 0),
  checkin_code      text,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists events_game_starts_idx on public.events (game_id, starts_at);
create index if not exists events_starts_idx      on public.events (starts_at);
create index if not exists events_host_idx        on public.events (host_profile_id);

alter table public.events enable row level security;

drop policy if exists "events public read" on public.events;
create policy "events public read"
  on public.events for select
  using (true);

drop policy if exists "events insert own host" on public.events;
create policy "events insert own host"
  on public.events for insert
  with check (host_profile_id = auth.uid());

drop policy if exists "events update own host" on public.events;
create policy "events update own host"
  on public.events for update
  using (host_profile_id = auth.uid())
  with check (host_profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- event_rsvps
-- ---------------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  status         text not null default 'interested',   -- going | interested | waitlist | cancelled
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index if not exists event_rsvps_event_idx        on public.event_rsvps (event_id);
create index if not exists event_rsvps_event_going_idx  on public.event_rsvps (event_id) where status = 'going';
create index if not exists event_rsvps_profile_idx      on public.event_rsvps (profile_id);

alter table public.event_rsvps enable row level security;

drop policy if exists "rsvps public read" on public.event_rsvps;
create policy "rsvps public read"
  on public.event_rsvps for select
  using (true);

drop policy if exists "rsvps insert own" on public.event_rsvps;
create policy "rsvps insert own"
  on public.event_rsvps for insert
  with check (profile_id = auth.uid());

drop policy if exists "rsvps update own" on public.event_rsvps;
create policy "rsvps update own"
  on public.event_rsvps for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "rsvps delete own" on public.event_rsvps;
create policy "rsvps delete own"
  on public.event_rsvps for delete
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  game_id     text references public.games (id) on delete cascade,   -- null = platform-wide
  author_id   uuid references public.profiles (id) on delete set null,
  title       text not null,
  body        text,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists announcements_game_idx    on public.announcements (game_id);
create index if not exists announcements_pinned_idx  on public.announcements (pinned, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read"
  on public.announcements for select
  using (true);

-- ---------------------------------------------------------------------------
-- Demo RSVP seed — run AFTER real auth users exist. Replace the profile ids
-- with rows from `select id, handle from public.profiles limit 3;`
-- ---------------------------------------------------------------------------
-- with e as (select id from public.events order by starts_at limit 2)
-- insert into public.event_rsvps (event_id, profile_id, status)
-- select e.id, p.id,
--        (array['going','going','interested'])[1 + (row_number() over ()) % 3]
-- from e cross join (
--   select id from public.profiles where handle in ('REPLACE_1','REPLACE_2','REPLACE_3')
-- ) p
-- on conflict (event_id, profile_id) do nothing;
