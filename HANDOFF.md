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
- **Scrim Finder** (`/`) — filterable feed, reads LIVE `scrim_listings` (join teams/schools/ratings/reliability) via `src/features/scrims/queries.ts`.
- **Rank** (`/rank`, `/rank/submit`, `/rank/review`) — per-game submission form (config-driven; `peak`/`mode` now selects), screenshot → `rank-proofs` bucket, pending/verified, admin review queue. Trusted-submitter auto-approve trigger.
- **Teams** (`/teams`, `/teams/new`, `/teams/[id]`, `/teams/[id]/manage`) — browse, profile (rating ‖ standing), create, roster. Game-switch now moves the `ratings` row.
- **Leaderboards** (`/leaderboards`) — team+player boards, rating|standing sort, region/school filters, **scope toggle: nationwide / regional / my-school**. Player board fills after a bracket match advances.
- **Match Room** (`/matches`, `/matches/[id]`) — locked ruleset, countdown, dual-confirm results → **Elo recompute (DB trigger) + reliability + standing**. Head-to-head panel on the detail page.
- **Events** (`/events`, `/events/new`, `/events/[id]`) — meetups+online feed, announcements, RSVP, QR check-in, exam-week banner. `datetime-local` now pinned to Asia/Manila.
- **Brackets** (`/brackets`, `/brackets/[slug]`, `/brackets/new`, `/brackets/[slug]/manage`) — seeded single-elim tournaments; host seeds/generates + reports scores; winner propagates; completion feeds Elo + player ratings + standing. Demo: 4-team MLBB `tambayan-mlbb-season-0`.
- **Orgs** (`/orgs`, `/orgs/[slug]`, `/orgs/new`, `/orgs/[slug]/manage`) — varsity/community/league pages; members; org↔team link. 3 demo orgs.
- **Free agents** (`/free-agents`, `/free-agents/new`) — seeking-team / seeking-player board, game-scoped, close own post.
- **Mentorship** (`/mentorship`, `/mentorship/new`) — auth-gated; request VOD-review/coaching/general; a mentor accepts via SECURITY DEFINER RPC.
- **PWA native feel** — viewport locked + `touch-action` + `NativeFeelGuard` iOS gesture/double-tap suppression.

## DB

24 tables + 1 view + RLS. Migrations `20260906010001`–`010011`:
- 01 core schema · 02 RLS · 03 reference seed · 04 demo seed · 05 auth profile trigger · 06 rank-proofs storage · 07 wave2 RLS deltas · 08 demo matches
- **09 wave3 schema** — `profiles.onboarded / school_other / trusted_submitter`; `orgs` + `org_members` + `teams.org_id` + `is_org_admin()`; Elo trigger `apply_match_result()` on confirmed `scrim_matches`; `recompute_reliability_score()` (score = 100 − no_shows·8 − early_quits·4); `report_no_show()` RPC; `head_to_head` view; `fast_track_trusted_submission()` rank trigger; per-game form_fields updated (valorant peak / codm mode carry `options`)
- **10 mentorship RPCs** — `list_open_mentorships(p_game)`, `accept_mentorship(p_id)` (both SECURITY DEFINER, granted to authenticated)
- **11 brackets** — `tournaments` + `tournament_entrants` + `bracket_matches`; `generate_bracket()` (seeded single-elim, power-of-two, host-only) + `advance_bracket_match()` (winner propagation + Elo + community standing + player-rating mirror). Demo: 4-team MLBB `tambayan-mlbb-season-0`, status `live`.

All 3 applied LIVE via Management API this session (also auto-apply on push; idempotent). Types regenerated → `src/lib/db/types.ts`.

Verify build: `npx tsc --noEmit && npm run lint && npm run build` — all green as of commit `be08b47`.

## DONE this session (commit `be08b47`, NOT yet pushed)

1. ✅ Onboarding — `profiles.onboarded` flag; proxy trap keyed on it; school + region optional; "my school isn't listed" free-text path (`profiles.school_other`).
2. ⚠️ Live auth E2E — still NOT run. Claude can't create accounts / enter passwords. Needs a human: signup (Gmail + `.edu.ph`) → onboarding → signin → check `profiles` row (onboarded, roles, school_id/school_other, school_verified).
3. ✅ Browser QA — all new routes + scrims/leaderboards/brackets/orgs checked at 375 + desktop, console/server logs clean. Full pass at 320/768 still worth doing.
4. ✅ Scrim Finder now reads live `scrim_listings` (via `src/features/scrims/queries.ts`); mock `seed.ts` deleted. `SkeletonCard.tsx` now orphaned (harmless).
5. ✅ `src/lib/db/types.ts` regenerated (3×).
6. ✅ Review nits — teams game-switch moves the `ratings` row; events `datetime-local` pinned to Asia/Manila (`manilaLocalToIso`); rank `peak`/`mode` render as selects (form-field `options`).
7. ⚠️ **Supabase PAT STILL NEEDS ROTATING** — a `sbp_…` token was pasted in chat again this session and used for live migration apply + type gen. Rotate: Supabase dashboard → Account → Access Tokens. Consider storing the next one in `.env.local` (git-ignored) instead of chat.
8. ✅ ALL stretch features built: free-agent board (`/free-agents`), reliability auto-calc (trigger), mentorship (`/mentorship`), head-to-head (Match Room panel), trusted-submitter fast-track (trigger), org pages (`/orgs`), **bracketing** (`/brackets`), leaderboard local/regional/nationwide scope toggle.
9. ✅ Stage 1 abstract → `docs/stage1-abstract.md` (2 pages, 4 sections) + `docs/stage1-wireframe.svg` (5 mobile frames). `docs/handoff.md` is still the original brief.

## NEXT

- **Push `be08b47`** → triggers Vercel prod deploy + Supabase migration re-apply (idempotent, already live). Needs explicit go.
- Live auth E2E (item 2) — human-run.
- QA at 320px / 768px; nav strip is now 10 items (scrolls on mobile — check it feels ok).
- Player leaderboard fills only after a bracket match is advanced (player ratings mirror team rating on `advance_bracket_match`).
- `SkeletonCard.tsx` orphan cleanup; optional: `registerTeam` already guards `team.game_id === tournament.game_id`.

## Build/run

```
npm run dev        # localhost:3000
npm run build      # turbopack prod build
```
`.env.local` has live Supabase creds (git-ignored). Supabase admin ops this session went through the Management API with the PAT (no service_role key in `.env.local`).
