# HANDOFF — The Next Gen 2026 Stage 1 Submission

**Deliverable:** two-page project abstract (Title & Elevator Pitch / Problem Statement / Solution Architecture & Tech Stack / UI Wireframe)
**Due:** September 7, 2026
**Team:** 4 first-year software engineering students
**Status of this doc:** Sections 1–2 are final copy. Sections 3–4 are a build brief for Claude Code.

---

## HARD CONSTRAINT — READ FIRST

The whole abstract must fit on **two pages**. That is roughly 700–900 words of body text plus one wireframe figure. Everything in Sections 3 and 4 below must be compressed to fit. Do not produce a ten-page architecture document — produce something that survives being squeezed onto half a page.

---

## 1. Project Title & Elevator Pitch

### Primary title

**TAMBAYAN**
*The scrim network for Philippine collegiate esports.*

The name carries both halves of the product: the online hangout where teams find each other, and the physical hangout the platform pushes players back toward. It is instantly legible to a Filipino judging panel and it is not another English portmanteau.

**Backup titles if the team wants alternatives:**
- **ScrimUp** — plainer, function-forward, easier to explain to a non-Filipino judge.
- **LFS (Looking For Scrim)** — leans on the exact phrase players already type into Facebook groups.

### Elevator pitch (use as-is)

> Finding a scrimmage in Philippine collegiate esports still means posting "LF scrim" into a Facebook group and hoping the right team scrolls past. There is no way to see who is actually available tonight, no way to know if they are your skill level, and no record that the match ever happened.
>
> Tambayan is a progressive web app built on two pillars. The first: finding a scrim becomes a two-minute action instead of a two-day chase. Teams publish real availability windows, get matched against opponents at their level, lock in agreed rules before they queue, and report the result — which builds a persistent competitive rating for every team and player across Mobile Legends, Valorant, Dota 2, and Call of Duty Mobile.
>
> The second: the platform is built to pull players back into the physical world, not deeper into the screen. Campus LANs, watch parties, onsite finals, and meetups are first-class content sitting alongside the scrim feed — not a buried tab. Teams carry a community standing next to their competitive rating. Players can flag exam weeks so opponents know they're studying instead of ghosting. The people you scrim online are the people you can meet on campus that weekend.
>
> A *tambayan* is the place you hang out with your team. We built both halves of it — the online one and the real one.

---

## 2. Problem Statement

Write it around these five failures. Keep it to ~200 words in the final abstract; this section is the raw material.

**1. Discovery is broken.** Scrim-finding lives in scattered Facebook groups, one-off Discord servers, and GC threads. A post is visible for minutes before it is buried. There is no filter for game, rank, region, or time. Teams routinely go a full week without a practice match not because opponents don't exist, but because they never saw each other.

**2. No shared measure of skill.** Even when two teams connect, neither can verify the other's level. A collegiate team preparing for a regional qualifier ends up scrimming a group four tiers below them, and both sides waste the night. In-game ranks are per-player, not per-team, and don't cross games.

**3. Nothing persists.** Scrims leave no record. There is no team history, no head-to-head, no way for a player to show what they've actually done when they try out for a better roster. Everything resets when the group chat dies.

**4. Coordination failures are constant.** No-shows, arguments over map/mode/series length mid-lobby, and rosters padded with non-students. Nothing binds a scrim agreement and nothing tracks who ghosts.

**5. The scene is almost entirely online, and that costs players something.** There is no on-ramp for a first-year who wants to compete but doesn't know anyone. Teammates who have played together for two semesters have never met. Students grind alone in their rooms while an org two buildings over is looking for exactly them, and the campus events that do happen are announced in one Facebook post that most of the intended audience never sees. Competitive play and physical community have been fully decoupled, and nothing currently exists to reconnect them.

Close the section by naming the population: **thousands of enrolled undergraduates across hundreds of Philippine campuses, competing in four of the most-played titles in the country, with no purpose-built infrastructure between them.**

---

## 3. BUILD BRIEF — Solution Architecture & Tech Stack

*Claude Code produces this section. What follows is the spec, the constraints, and the decisions already made.*

### 3.1 Scope discipline

The team is four first-year students with a 48-hour onsite build in Stage 2, during which a **surprise theme or API is revealed at Code Kickoff and must be integrated**. Architect for something that can absorb an unknown requirement on day two. That means: modular feature folders, a schema that tolerates new entity types, and no clever infrastructure that only one person understands.

### 3.2 Rank verification — submission form, not API integration

**Decision made: no automatic game-data import.** Three of the four supported titles have no public API (MLBB and CoDM have none at all; Valorant's requires an approved Riot production key), so an integration-based design would only ever work for Dota 2 and would break the demo. The team is building the manual path instead, and it is the right call for a 48-hour build.

**How it works:**

1. **Rank submission form.** The player picks a game, then fills a per-game form with the fields that game actually uses — MLBB has its own tier ladder, Valorant has another, Dota 2 uses MMR, CoDM uses its own. The form fields are driven by a per-game config, not hardcoded, so adding a fifth game is a config entry rather than a code change.
2. **Screenshot as proof.** The player attaches an in-game screenshot of their rank. Stored in Supabase Storage, linked to the submission.
3. **Review board.** Submissions land in a moderation queue where an admin or verified org handler approves or rejects them. Approved submissions flip the profile's rank badge to **Verified**; pending ones display as **Unverified** but still let the player use the platform. Rejected ones return to the player with a reason.
4. **Native rating on top.** Every scrim booked through the platform gets its result reported and confirmed by both teams, feeding a rating per team per game. The submitted rank seeds a new team's starting position; actual match results are what move it after that. This is the part that requires nobody's API.

Frame it in the abstract as a strength, not a compromise: *verification is human-reviewed and works identically across every game, including the ones with no developer API.*

**Note on the review queue:** an approval board is a real moderation surface with a real workload. For the demo, one admin role and a simple approve/reject queue is enough. Do not build a multi-tier moderation system.

### 3.3 Stack — locked

Decided by the team. Do not substitute.

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. PWA via a service worker for installability and an offline shell — satisfies "PWA now, native app later" from the same codebase.
- **Backend/data:** **Supabase** — Postgres, row-level security, auth, realtime subscriptions, and file storage in one service. Screenshot proofs go in Supabase Storage with RLS so a player can only read their own submissions plus anything approved and public.
- **Hosting:** **Vercel**, with preview deploys wired to the repo from hour one.
- **Realtime:** Supabase Realtime for scrim notifications, announcements, and chat.
- **Push:** Web Push API for scrim requests and match reminders.

### 3.3b Account roles

Sign-up asks the user to pick a role, and the choice shapes the interface from that point on:

- **Player** — has game profiles and ranks, joins teams, appears on player leaderboards, browses scrims, can post to the free-agent board.
- **Team Handler** — creates and manages a team, posts scrim listings and availability, sends and accepts scrim requests, reports results, manages the roster.
- **Both** — a player-captain, which is the common case in the collegiate scene. Expect this to be the most-selected option.

Implementation: one `User` row with a `roles` array (`['player']`, `['handler']`, or both), not three separate account types. Role is switchable from settings — a first-year who joins as a player and later starts a team should not need a new account. Gate features by role rather than forking the whole app; the navigation shows handler tools only when the handler role is present.

School email domain verification (`@*.edu.ph`) establishes the collegiate tie for both roles, with manual COR review as fallback.

### 3.4 Data model — core entities

**Everything competitive is scoped to a `game_id`.** Scrims, leaderboards, announcements, ranks, teams, and events all carry one. A user picks a game and sees only that game's world; nothing is ever mixed across titles. Games live in a `Game` table with a per-game config for rank tiers and form fields, so the fifth game is a data insert.

`User` (with `roles` array) · `School` · `Game` (with rank-tier config) · `Team` (game-scoped, with roster) · `GameProfile` (user + game, submitted rank, verification status) · `RankSubmission` (game, claimed rank fields, screenshot URL, status, reviewer, reason) · `ScrimListing` (game, availability window, format, ruleset, skill range) · `ScrimMatch` (booked, result, dual confirmation) · `Rating` (per team and per player, per game) · `Event` (game-scoped or cross-game; online tournament or physical meetup, with RSVP) · `Announcement` (game-scoped or platform-wide) · `MentorshipRequest` · `FreeAgentPost` · `ReliabilityScore`.

### 3.5 Feature set

**MVP — must be demoable:**
1. Sign-up / sign-in with role selection (player, team handler, or both) and school email verification
2. Rank submission form with screenshot upload, per-game fields, and a review board that approves or rejects
3. Team creation and roster management (handler role)
4. Scrim listing with structured availability windows, not free-text posts
5. Scrim request → accept → agreed ruleset locked in (mode, maps, series length, server)
6. Post-match result reporting with dual confirmation → rating update
7. Team and player leaderboards, per game, filterable by region and school
8. Announcements board, per game, plus platform-wide notices
9. Events hub — online tournaments and physical meetups as equal-weight content, with RSVP and QR check-in
10. Community standing displayed alongside competitive rating
11. Exam-week status that pauses listings without penalty

**Stretch — mention in the abstract, build if time allows:**
9. **Free-agent board.** Players looking for a team, teams looking for a fifth. This is a real, constant need in the scene and it is cheap to build.
10. **Reliability score.** No-shows and mid-series quits are the scene's biggest coordination failure. A visible score that both teams affect after every booked scrim fixes an actual problem, not a hypothetical one.
11. **Mentorship matching.** Veterans opt in as mentors; new players request VOD review or a coaching session. Ties directly to the tournament's stated objective of "nurturing the next generation."
12. **Head-to-head history and scrim VOD/replay links** attached to match records.
13. **Roster lock for tournaments** — prevents ringers, reinforces the collegiate-eligibility angle.
14. **Campus org pages** — a school's esports org gets a home with its teams, events, and announcements.
15. **Trusted-submitter fast track** — a player whose last few rank submissions were all approved gets auto-approved on the next one, keeping the review queue small as the platform grows. Cheap to build, and a good answer to the "does this scale?" question at Demo Day.

### 3.5b The balance pillar — design it properly

This is a co-equal pillar of the product, not a bolted-on feature. But there is a right way and a wrong way to build it, and the wrong way will get picked apart in Q&A.

**The governing principle: reward presence, never punish play.** Every mechanic here adds something for showing up in the physical world. None of them tracks playtime, restricts access, sends guilt notifications, or displays how long anyone has been online. A platform that scolds gamers for gaming will be dismissed by the exact audience it is built for — and a judging panel will spot it instantly. The pitch is *we make the offline scene worth attending*, not *we make the online scene feel bad*.

**Build these:**

1. **Meetups as first-class content.** Campus LANs, watch parties, bootcamps, and onsite tournaments live in the main feed alongside scrim listings — same visual weight, same discovery surface. This alone does most of the work. The reason nobody attends campus events right now is that nobody hears about them.
2. **Hybrid event format.** An online scrim series or ladder that culminates in an onsite finals. Ties the two pillars into one flow instead of two parallel features.
3. **QR check-in at events.** Organizers generate a code; attendees scan it on arrival. Gives you verified attendance data, which is what everything below depends on.
4. **Community standing.** A second stat displayed next to a team's competitive rating, earned by attending and hosting physical events. Two axes, both positive. A team can be strong competitively, strong in the community, or both — and the leaderboard can be sorted either way.
5. **Exam-week status.** A player or team sets an academic break; their listings pause and their profile shows they're studying rather than ghosting, so their reliability score is unaffected. This is the sharpest idea in the whole balance pillar — it is genuinely useful, it protects the collegiate eligibility the tournament itself requires, and no existing tool does it.
6. **Meet-your-opponents surfacing.** After a scrim, if both teams are in the same region, surface upcoming meetups where they could actually meet. Turns online matches into offline contact, which is the entire thesis.
7. **Org-hosted campus event pages** so school esports orgs have a real channel to their own students.

**Stretch, if there's time:** short optional warm-up and cooldown routines between scrims — wrist, posture, eye rest. Frame this as performance practice, the way pro orgs treat it, and keep it entirely opt-in. It is legitimate injury prevention, not a wellness lecture.

**Do not build:** screen-time tracking, playtime caps, streak-breaking notifications, "you've been playing too long" prompts, or any public metric that could be read as shaming. If a feature only works by making the user feel bad, cut it.

### 3.6 What to actually produce for Section 3

A **single architecture diagram** — Next.js PWA on Vercel → Supabase (Postgres + RLS, Auth with role claims, Storage for screenshots, Realtime for notifications) — with the rank-verification path drawn explicitly: submission form → Storage → review queue → verified profile → seeded rating → match results. Plus a stack table and about 120 words of prose. That is the entire space available. Everything above is background for you, not text for the page.

---

## 4. BUILD BRIEF — UI Wireframe

*Claude Code produces this section.*

### 4.1 Constraint

Four to five screens maximum, arranged as a single figure on page two. Mobile-first frames (they read as a PWA and they tile more compactly on the page than desktop frames do).

### 4.2 Screens, in priority order

A persistent **game switcher** sits in the header of every screen (MLBB / Valorant / Dota 2 / CoDM), since all content is game-scoped. Show it in every frame.

1. **Scrim Finder** — the hero screen. A filterable feed of available teams within the selected game: rank band, time window, format. Each card shows team name, school, rating, reliability score, verified badge, and a one-tap Request Scrim. This screen alone should communicate the product.
2. **Rank Submission** — the per-game form with screenshot upload and the pending/verified status states. Worth a frame because it is the trust mechanism the whole rating system rests on.
3. **Leaderboards** — toggle between team and player within the selected game, filter by region and school.
4. **Match Room** — the booked scrim: agreed ruleset displayed, opponent contact, countdown, and the result-reporting flow with dual confirmation.
5. **Meetups & Events** — the feed of campus LANs, watch parties, and onsite finals with RSVP and check-in state, plus the game's announcement board. Give this frame the same visual weight as the Scrim Finder; the balance pillar has to be visible in the wireframe, not just claimed in the prose.

If a sixth frame fits, use **Sign-up role selection** — the player / team handler / both choice is unusual enough to be worth showing. A team profile showing competitive rating and community standing side by side is the other strong candidate.

### 4.3 Visual direction

Dark UI, high-contrast accent, dense information display — the visual language competitive players already expect from esports tools. Avoid a generic social-app look; it will read as a Facebook clone and undercut the pitch. Consistent game-color coding across all screens (one hue each for MLBB, Valorant, Dota 2, CoDM) so the four-game scope is visible at a glance.

### 4.4 Format

Deliver as clean SVG or a rendered HTML mockup exportable to image, sized to sit on half a page at legible scale.

---

## 5. Open decisions for the team

- [ ] Lock the title. **Tambayan** unless someone objects in the next hour.
- [ ] Confirm whether the abstract is submitted as PDF and whether there is a template or naming convention.
- [ ] Decide the demo dataset — seeded fake teams make Stage 2 far more convincing than an empty database.
- [ ] Assign now: one person owns the pitch narrative, one owns the wireframes, two own the build.
