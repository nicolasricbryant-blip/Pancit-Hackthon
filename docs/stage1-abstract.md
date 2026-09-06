# TAMBAYAN

**The scrim network for Philippine collegiate esports.**

The Next Gen 2026 — Stage 1 Project Abstract
Team: four first-year software engineering students

---

## 1. Elevator Pitch

Finding a scrimmage in Philippine collegiate esports still means posting "LF scrim"
into a Facebook group and hoping the right team scrolls past before the post is
buried. There is no way to see who is available tonight, no way to know if they
are your skill level, and no record that the match ever happened.

Tambayan is a progressive web app built on two pillars. **The first:** finding a
scrim becomes a two-minute action instead of a two-day chase. Teams publish real
availability windows, get matched against opponents at their level, lock the
agreed ruleset before they queue, and report the result — which builds a
persistent competitive rating for every team and player across Mobile Legends,
Valorant, Dota 2, and Call of Duty Mobile. **The second:** the platform pulls
players back into the physical world rather than deeper into the screen. Campus
LANs, watch parties, onsite finals, and meetups are first-class content beside
the scrim feed. Teams carry a *community standing* next to their competitive
rating. Players flag exam weeks so opponents know they are studying, not ghosting.
The people you scrim online are the people you can meet on campus that weekend.

A *tambayan* is the place you hang out with your team. We built both halves of it.

---

## 2. Problem Statement

**Discovery is broken.** Scrim-finding lives in scattered Facebook groups and GC
threads. A post is visible for minutes before it is buried, and there is no filter
for game, rank, region, or time. Teams go a full week without a practice match not
because opponents don't exist, but because they never saw each other.

**There is no shared measure of skill.** Even when two teams connect, neither can
verify the other's level. In-game ranks are per-player, not per-team, and do not
cross games, so a team preparing for a regional qualifier ends up scrimming a
roster four tiers below them and both sides waste the night.

**Nothing persists.** Scrims leave no record — no team history, no head-to-head,
no way for a player to show what they have done when they try out for a better
roster. Everything resets when the group chat dies.

**Coordination fails constantly.** No-shows, mid-lobby arguments over
map/mode/series length, and rosters padded with non-students. Nothing binds a
scrim agreement and nothing tracks who ghosts.

**The scene is almost entirely online, and that costs players something.** There
is no on-ramp for a first-year who wants to compete but knows no one. Teammates
of two semesters have never met. The campus events that do happen are announced
in a single Facebook post most of the intended audience never sees.

The population underneath this: **thousands of enrolled undergraduates across
hundreds of Philippine campuses, competing in four of the most-played titles in
the country, with no purpose-built infrastructure between them.**

---

## 3. Solution Architecture & Tech Stack

Everything competitive is scoped to a `game_id` — scrims, teams, ranks,
leaderboards, events, and announcements all carry one, and games are config rows
(rank tiers + per-game form fields), so a fifth title is a data insert, not a
code change. Accounts are one row with a `roles` array (`player`, `handler`, or
both); the navigation gates handler tools on the role rather than forking the app.

**Rank verification is human-reviewed and works identically across every game,
including the three with no developer API.** A player fills a per-game form, then
attaches an in-game screenshot. The proof lands in Supabase Storage; the
submission enters a moderation queue where an admin approves or rejects it.
Approval flips the profile badge to **Verified** and seeds the team's starting
rating. From then on, dual-confirmed match results — not anyone's API — are what
move the rating. A trusted-submitter fast-track auto-approves players whose recent
submissions were all clean, keeping the queue small as the platform grows.

```
  ┌─────────────────────────────┐        ┌──────────────────────────────────────┐
  │  Next.js (App Router) PWA   │        │              Supabase                │
  │  React 19 · TypeScript      │  HTTPS │  Postgres + Row-Level Security       │
  │  service worker · Web Push  │ ─────► │  Auth (role claims, @*.edu.ph)       │
  │  hosted on Vercel           │ ◄───── │  Storage (rank screenshots, RLS)     │
  └─────────────────────────────┘  realtime  Realtime (scrims, announcements)   │
                                          └──────────────────────────────────────┘

  Rank path:  submission form ──► Storage (screenshot)
                    │
                    ▼
              review queue ──► Verified profile ──► seeded rating ──► match
              results (dual-confirm) ──► Elo update ──► leaderboards
```

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | One codebase, PWA now / native later |
| Data | Supabase Postgres + RLS | Auth, storage, realtime in one service |
| Auth | Supabase Auth + `roles` array | `@*.edu.ph` domain check for collegiate tie |
| Storage | Supabase Storage | Screenshot proofs, per-user read policy |
| Rating | In-DB Elo trigger on confirmed matches | No external API, identical across all games |
| Hosting | Vercel | Preview deploys wired from hour one |

The architecture is deliberately modular — feature folders, a schema that
tolerates new entity types — so the Stage 2 surprise requirement can be absorbed
without a rewrite. The balance pillar (meetups in the main feed, hybrid
online-to-onsite events, QR check-in, community standing, exam-week status) is
built into the same tables, not bolted on. **The governing principle: reward
presence, never punish play** — no screen-time tracking, no playtime caps, no
metric that could be read as shaming.

---

## 4. UI Wireframe

Mobile-first frames — the product ships as a PWA. A persistent **game switcher**
(MLBB / Valorant / Dota 2 / CoDM, one hue each) sits in every header; all content
is game-scoped and the four-game scope is visible at a glance. Dark, dense,
high-contrast — the visual language competitive players already expect, not a
social-app look.

*See `stage1-wireframe.svg` — five frames, page two:*

1. **Scrim Finder** *(hero)* — filterable feed of available teams in the selected
   game: rank band, time window, format. Each card: team name, school, rating,
   reliability score, verified badge, one-tap **Request Scrim**.
2. **Rank Submission** — per-game form + screenshot upload, with the
   pending / verified / rejected status states. The trust mechanism the whole
   rating system rests on.
3. **Leaderboards** — team ⇄ player toggle within the game, filterable by region
   and school, sortable by competitive rating or community standing.
4. **Match Room** — the booked scrim: agreed ruleset locked, opponent contact,
   live countdown, and the dual-confirmation result flow.
5. **Meetups & Events** — campus LANs, watch parties, and onsite finals with RSVP
   and QR check-in state, plus the game's announcement board. Same visual weight
   as the Scrim Finder — the balance pillar is visible in the wireframe, not just
   claimed in the prose.
