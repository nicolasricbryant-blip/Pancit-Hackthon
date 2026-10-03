# HANDOFF — TAMBAYAN

PH collegiate esports scrim network. PWA. Next.js 16 (App Router, Turbopack) + React 19 + TS strict + Tailwind v4 (CSS-first, no config) + Supabase (@supabase/ssr).

## Live

- **Prod:** https://tambayan-red.vercel.app
- **Repo:** https://github.com/nicolasricbryant-blip/Pancit-Hackthon (default branch `master`)
- **Vercel:** project `tambayan` (`prj_qpDXxLPHWtXZot52IlT2aeHPJebL`, team `nicolasricbryant-9459s-projects`). Env vars set (prod/preview/dev): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Supabase:** ref `didlozqquuszabfbznll`. GitHub-connected → `supabase/migrations/*` auto-apply on push (all idempotent). Admin ops go through the Management API (`api.supabase.com/v1/projects/<ref>/database/query`, needs a browser-ish `User-Agent` or Cloudflare 403s).

### ⚠️ The "git push = Preview only" mystery — SOLVED (2026-09-12)

Previous handoffs went back and forth on whether a push to `master` deploys to production. It did not, and the cause was a config mismatch, not flaky behaviour:

**Vercel's `productionBranch` was set to `main`, but this repo's default branch is `master`.** Vercel was watching a branch that is never pushed, so *every* push to `master` built as a **Preview** with `target: null` and the `tambayan-red.vercel.app` alias never moved. `vercel --prod --yes` from the CLI appeared to "work" only because a CLI deploy bypasses the git branch config entirely.

**Fixed** — `productionBranch` is now `master` (via `PATCH /v2/projects/<id>/branch`). Pushes to `master` now auto-deploy to production and move the alias. No manual promote step. If production ever goes stale again, check this setting first.

Quick way to tell what prod is actually serving:

```
curl -s https://tambayan-red.vercel.app/sw.js | grep -o 'tambayan-shell-v[0-9]*'   # expect v3
curl -so /dev/null -w '%{http_code}\n' https://tambayan-red.vercel.app/brand/splash-bg.webp   # expect 200
```

## Wave 5 — SHIPPED + DEPLOYED (2026-09-11/12, PR #5 → `b3029d3`)

Full-site bug review triggered by a report of being stuck on the onboarding screen. **24 bugs found and fixed.** `tsc`, `lint` and `next build` were green before *and* after every commit — every finding was behavioural, none catchable by the toolchain. Two dominant patterns, both worth watching for in new code:

1. **Writes that report success without writing.** PostgREST returns `error: null` when a write matches **zero rows**, so an RLS-filtered or missing row is indistinguishable from success. Found in 9 places. Always `.select("id").maybeSingle()` and treat a null result as failure — see `declineScrimRequest` in `features/scrims/actions.ts` for the reference shape.
2. **UI confidently promising behaviour the backend never implemented.** Four features were pure façade (details below).

### The onboarding trap (the reported bug — two independent causes)
- **Dead chrome during a hard gate.** `/onboarding` renders inside the root layout, so the tab bar, game band and wordmark-home link were all on screen — while `proxy.ts` bounces any authed user with `onboarded = false` back to `/onboarding`. Every tap 307'd straight back; nothing appeared to happen. `layout.tsx` now derives `onboardingGate` and suppresses `AppNav`/`GameBand`, reducing the header to a non-navigating form with Sign out as the only escape.
- **"Finish setup" could silently fail.** `.update().eq("id", user.id)` wrote zero rows (RLS, or no `profiles` row) and still navigated away, so the proxy re-trapped the user with no error. Now an `upsert(...).select("id").maybeSingle()` that creates the row when missing.

### Auth / routing
- **`ERR_TOO_MANY_REDIRECTS`** — `requireProfile()` sent a profile-less caller to `/sign-in`, which redirects an already-signed-in user straight back. Hit every `requireProfile` route. Signed-out → `/sign-in`; signed-in-with-no-row → `/onboarding` (which upserts). `/profile` and `/notifications` added to `AUTH_PREFIXES`.
- **Fail open on a failed read.** `maybeSingle()` returns `data: null` for both "no such row" and "the query errored". The proxy runs on *every* request, so treating a transient Supabase failure as "not onboarded" would bounce the whole signed-in userbase into onboarding. Both `proxy.ts` and `requireProfile` now gate only on a read that actually succeeded. **Do not "simplify" these back to `!profile || !profile.onboarded`.**

### Service worker (`public/sw.js`) — was leaking authenticated pages across users
Old worker was cache-first for every same-origin GET and cached every response. Personalized HTML/RSC landed in a cache shared by everyone on that browser profile, so **after sign-out the next user could be served the previous user's pages**. Also: `/` precached at install (proxy never ran, deploys never reached clients), the offline fallback returned the `/` HTML shell for RSC fetches, and `cache.put` on an `opaqueredirect` rejected unhandled.

Now: navigations and RSC fetches **bypass the worker entirely** so the proxy always runs. Cache-first is scoped to `/_next/static`, `/icons`, `/brand`, the manifest and images. `CACHE` bumped to `tambayan-shell-v3`; the `activate` handler deletes every non-matching cache, which is what evicts the poisoned v2 from existing clients.

### Four façade features, made real
- **Request Scrim** was a 900ms `setTimeout` — no auth check, no write, no table. Now migration `…018`: `scrim_requests` + RLS + `accept_scrim_request(p_id)` RPC that books the `scrim_matches` row, stamps the request, flips the listing to `matched` and declines the listing's other bids, atomically. `requestScrim` resolves `from_team` from the session and never trusts a client team id. `/matches` gained an **Incoming scrim requests** panel so the receiving handler can act on them.
- **Exam-week mode** was stored and displayed ("On — listings paused") but nothing filtered listings and `exam_mode_until` was never read. `listScrimsForGame` now excludes listings whose team handler has exam mode active, expiry computed against the **Manila** calendar date (`now + 8h`, UTC date part) — server UTC would lapse the pause up to 8h early for PH users.
- **Event capacity** was collected and rendered ("12 / 20 going", fill bar) and checked nowhere. Migration `…019` adds a `before insert or update` trigger on `event_rsvps`. It excludes the caller's own row by `(event_id, profile_id)`, **not** by `id` — `.upsert()`'s `ON CONFLICT DO UPDATE` fires the BEFORE INSERT trigger once for a speculative insert with a fresh id, so an id-based exclusion would reject a harmless going→going re-RSVP at a full event.
- **Fake loading skeletons** — `TeamsBrowser`/`OrgsBrowser` ran a hardcoded 400–500ms `setTimeout` showing skeletons over data already in props. Removed.

### Authorization
- **Two RLS holes in the new `scrim_requests`**, both reachable because the anon key is public in the browser (RLS is the boundary, *not* the server action): the update policy let either party write any status, so a requester could `PATCH` themselves to `accepted` and — combined with the pre-existing `scrim_matches_handler_write` — fabricate a booked scrim the other team never agreed to; and the insert policy never tied `to_team` to the listing. Now status is bound to party (receiver may only write `declined`, requester only `cancelled`; accepting is reachable *only* through the SECURITY DEFINER RPC), and inserts require `l.id = listing_id and l.team_id = to_team and l.status = 'open'`.
- All 20 `SECURITY DEFINER` functions audited for missing `auth.uid()` checks — the rest hold, including `advance_bracket_match`, which migration `…016` redefines and correctly preserves the host check in.
- `rank/actions.ts` had **no admin guard at all** (leaned entirely on RLS). RLS held, so this was false success rather than privilege escalation, but both an `isAdmin` guard and row verification were added.

### Also fixed
- **Sign-up could fail outright.** `handle_new_user` guarded `on conflict (id) do nothing`, but the generated handle sits on a *unique index* — a collision raised a unique violation that guard doesn't swallow, aborting the whole `auth.users` INSERT. Migration `…020` retries with the full uuid, then falls back to a null handle (onboarding collects one). The profile row always gets created.
- **The matchmaker discarded the player's stated rank band** — `coalesce(v_l.rank_min, pr.rank_min)` used the lobby's range whenever set and ignored the player's. Migration `…021` intersects both ranges via `lobby_rank_intersect_ok()`, and fixes `v_added` overcounting skipped `on conflict` inserts.
- **No path to the Team Handler role** — `/profile` said "Turn on in Settings", Settings had no role control, `/teams/new` hard-requires `isHandler`. Settings now has one (`admin` preserved on save).
- **Silent event check-in failures** — the route redirects with `?checkin=err`/`?checkin=notgoing`; the page only read `checkedin=1`.
- **Inverted rank ranges** (min > max) now validated in all three forms via `isValidRankRange()` in `features/games/config.ts`.
- **Splash overlay hardening** — was hidden only by an imperative inline `style.display` React doesn't track; now also sets `data-splash="skip"` so a re-render can't resurrect a full-screen `z-index: 999` overlay.
- **Dead code** — `AuthProvider`/`useAuth` wrapped the whole tree with nothing consuming it. Removed.

### Splash screen — real artwork + Montserrat
Was faking the design with a `linear-gradient` and a `clip-path` chevron. Now uses the real plate extracted from the source PSD (background layers only — logo, wordmark, tagline, ghost mark and loading bar hidden), at `public/brand/splash-bg.webp` (16 KB vs 456 KB PNG; the PNG is kept as the source-quality fallback file). Type is **Montserrat ExtraBold** via `--font-splash`, scoped to `.splash-word`/`.splash-tag`/`.splash-footer` — the rest of the app keeps Space Grotesk.

`background-position: center bottom` is deliberate and was verified with Playwright at 390×844, 1179×2556 (dpr 3) and 768×1024. The plate is 9:16, so `cover` yields **no vertical crop on any real phone**; the anchor only matters at ~4:3 tablet widths, where anchoring `top` cropped away the solid-navy bottom the progress bar and footer sit on.

## DB — migrations `…010001`–`…010021` (21 files)

Wave 5 added four, **all still UNVERIFIED as applied** (see below):

| Migration | What |
|---|---|
| `20260911010018_scrim_requests.sql` | `scrim_requests` table + RLS + `accept_scrim_request(uuid)` RPC |
| `20260911010019_event_capacity.sql` | `enforce_event_rsvp_capacity()` trigger on `event_rsvps` |
| `20260911010020_handle_new_user_collision.sql` | redefines `handle_new_user()` so a handle clash can't fail a sign-up |
| `20260911010021_matchmaker_rank_intersect.sql` | `lobby_rank_intersect_ok()` + redefines `run_lobby_matchmaker` |

Build: `npx tsc --noEmit && npm run lint && npm run build` — all green as of `b3029d3`. Prod build compiles 45 routes (35 statically generated).

## STILL OPEN / NEXT

**Do these first:**

1. **Verify migrations `…018`–`…021` actually applied.** They have never been executed by anyone — written idempotent, but unrun.
   ```sql
   select version, name from supabase_migrations.schema_migrations order by version desc limit 6;
   select to_regclass('public.scrim_requests') as tbl,
          to_regprocedure('public.accept_scrim_request(uuid)') as rpc;
   ```
2. **Regenerate `src/lib/db/types.ts`** once they have. The `scrim_requests` block and the `accept_scrim_request` entry in `Functions` are **hand-written stopgaps** (clearly commented as such) added to keep `tsc` green without a PAT. Regenerating replaces them with the real thing.
3. **ROTATE TWO TOKENS.** A Supabase `sbp_…` PAT has now been pasted in chat 4+ times across sessions, and a Vercel `vcp_…` token was pasted in chat on 2026-09-12 (used for the production deploy + the `productionBranch` fix). Revoke both: Supabase → Account → Access Tokens; Vercel → Account Settings → Tokens. Store replacements in `.env.local` (git-ignored), never in chat.

**Still unverified — needs a human signed-in pass** (no Supabase credentials exist in the Claude environment, so *no authenticated path has ever been executed*): sign-in E2E, the onboarding gate + finish-setup, the redirect-loop fix, role switching in Settings, avatar upload, event check-in (success + both error cases), exam-mode pausing, event capacity at the limit, the whole Request Scrim → accept → booked-match flow, create lobby → join → leave, host close/remove, the 60s ready-check, `MainRolePicker`, `AutoJoinControl`, and Find Match → Cancel (should turn auto-join back off).

This gap matters more than usual: **the dominant bug class found in Wave 5 was zero-row writes, which compile clean and fail only at runtime.** A green build says nothing about them.

Also worth a real-browser check: that the new service worker evicts the old `tambayan-shell-v2` cache on activate.

**Lower priority / deliberate non-fixes:**

- `GameBand`/`GameSwitcher` renders on `/settings`, `/profile`, `/notifications` and `/help`, where `?game=` is meaningless. Left as an author's design call, not a defect.
- Matchmaker runs synchronously in triggers/RPCs (no worker). Fine at pilot scale; revisit if lobby volume grows.
- `scrim_matches_handler_write` lets a handler of *either* team unilaterally insert a booked match. Pre-existing; Request Scrim makes it more reachable. Not changed in Wave 5.
- Scrim listings have **no creation UI** — they exist only via seed data, and there is no "my listings" surface anywhere. Worth knowing before building on top of the exam-mode pause, which hides listings from the public finder feed.

**Shipped in Wave 4.5 (2026-09-10), for context:** `player_match_stats` view (real Scrims/Wins/WinRate on `/profile`), scrim rating mirror onto roster members, community-standing mirror, desktop shell polish, Realtime for `/lobbies/[id]`, and `app/loading.tsx` using the previously-unused `SkeletonCard`. Migrations `…010014`–`…010017`.

## Build/run

```
npm run dev          # localhost:3000
npm run build        # turbopack prod build (45 routes)
git push origin master   # now auto-deploys to production (see the productionBranch note above)
vercel --prod --yes      # manual fallback: build + deploy + alias
```

`.env.local` has live Supabase anon creds (git-ignored). Admin ops go through the Management API with a PAT (no service_role key stored).
