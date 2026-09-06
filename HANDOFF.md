# HANDOFF — TAMBAYAN

PH collegiate esports scrim network. PWA. Next.js 16 (App Router, Turbopack) + React 19 + TS strict + Tailwind v4 (CSS-first, NO config) + Supabase (@supabase/ssr).

## Live

- **App (prod):** https://tambayan-red.vercel.app
- **Repo:** https://github.com/nicolasricbryant-blip/Pancit-Hackthon (branch `master`)
- **Vercel project:** `tambayan` (org nicolasricbryant-9459). GitHub-connected → auto-deploys on push. Env vars set (prod/preview/dev): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Supabase:** project ref `didlozqquuszabfbznll`. GitHub-connected → `supabase/migrations/*` auto-apply on push (all idempotent + already recorded in `schema_migrations`). Auth `site_url` + allow-list point at the Vercel domain + localhost.

## What ships (done, deployed)

- **Scaffold + design system** — hallmark: atmospheric/Workbench, custom dark theme, 4 game-hue tokens (mlbb/valorant/dota/codm). Tokens in `tokens.css`. Space Grotesk + Inter + JetBrains Mono.
- **App shell** — sticky header: wordmark · 4-way game switcher (`?game=`) · profile menu. Primary nav strip (role-gated). PWA manifest + SW + real icons (from `pwa icon.jpg`).
- **Auth** (`src/features/auth`, `src/app/(auth)`, `src/proxy.ts`) — sign-up (any email, role select player/handler/both), sign-in (password), sign-out, `/onboarding` (handle/roles/school/region), `/settings` (name/region/exam-week toggle). `mailer_autoconfirm = ON` — no email verify for pilot. Session helpers: `getCurrentProfile()` / `getUser()` / `requireProfile()` + `roles.ts` + `useAuth()`.
- **Scrim Finder** (`/`) — filterable feed, seeded 14 teams. Currently reads `src/features/scrims/seed.ts` MOCK (not live DB yet — see TODO).
- **Rank** (`/rank`, `/rank/submit`, `/rank/review`) — per-game submission form (config-driven fields), screenshot → `rank-proofs` bucket, pending/verified states, admin-only review queue (approve/reject).
- **Teams** (`/teams`, `/teams/new`, `/teams/[id]`, `/teams/[id]/manage`) — browse, profile (rating ‖ community standing, co-equal), create (seeds rating/reliability/standing), roster management.
- **Leaderboards** (`/leaderboards`) — team+player boards, rating|standing sort, region/school filters. Player board empty until player ratings exist.
- **Match Room** (`/matches`, `/matches/[id]`) — grouped list, locked ruleset, live countdown, result reporting + dual confirmation → status flip + winner (NO rating recompute yet). 4 demo matches seeded.
- **Events** (`/events`, `/events/new`, `/events/[id]`) — meetups+online feed (equal weight to scrims), announcements board, RSVP, QR check-in, exam-week banner. 6 events + 4 announcements seeded.

## DB

17 tables + RLS, mirrors `docs/handoff.md` §3.4. Migrations `supabase/migrations/20260906010001`–`010008`:
- 01 core schema · 02 RLS · 03 reference seed (4 games w/ rank-tier + form-field configs, 12 PH unis) · 04 demo seed (14 teams + ratings/reliability/standing + open listings + events + announcements) · 05 auth profile trigger · 06 rank-proofs storage bucket + RLS · 07 wave2 RLS deltas (admin write game_profiles; handler insert on stat tables) · 08 demo matches.

Verify build: `npx tsc --noEmit && npm run lint && npm run build` — all green as of this handoff.

## TODO — next session

1. **Auth polish for non-`.edu.ph` testers**: add `profiles.onboarded bool`, switch `src/proxy.ts` first-run trap from `!school_id` to `!onboarded`, make school OPTIONAL in `/onboarding` (+ "my school isn't listed" path). Right now a Gmail tester must pick one of the 12 seeded schools to escape onboarding.
2. **Live auth E2E** — actually run: signup (Gmail + `.edu.ph`) → onboarding → signin → profile row correct (roles, school_id, school_verified). Not yet executed live (was blocked on confirm-email; now unblocked).
3. **Browser QA pass** — every route at 320/375/768 + desktop. No visual review done yet.
4. **Wire Scrim Finder to live DB** — swap `src/features/scrims/seed.ts` for a Supabase query on `scrim_listings` join `teams`/`ratings`/`reliability_scores`. DB already has matching rows (same team names as the mock).
5. Regenerate `src/lib/db/types.ts` after any schema change (`supabase gen types typescript --project-id didlozqquuszabfbznll --schema public`).
6. Agent review nits — each feature's report has an "architect review list"; notable: teams `game_id` change doesn't move the `ratings` row; events `datetime-local` parsed in server TZ not Asia/Manila; rank `peak`/`mode` fields render as text not tier-select.
7. **Rotate the Supabase PAT** (`sbp_…` was pasted in chat) — Supabase dashboard → Account → Access Tokens.
8. Stretch features not built: free-agent board, reliability auto-calc, mentorship, head-to-head, trusted-submitter fast-track, org pages.
9. `docs/handoff.md` = the original paper-abstract brief. The 2-page Stage 1 abstract (Sections 3+4) was NOT written — pivoted to building the platform. Revisit if the abstract is still a deliverable.

## Build/run

```
npm run dev        # localhost:3000
npm run build      # turbopack prod build
```
`.env.local` has live Supabase creds (git-ignored). Supabase admin ops this session went through the Management API with the PAT (no service_role key in `.env.local`).
