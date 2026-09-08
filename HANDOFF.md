# HANDOFF — TAMBAYAN

PH collegiate esports scrim network. PWA. Next.js 16 (App Router, Turbopack) + React 19 + TS strict + Tailwind v4 (CSS-first, no config) + Supabase (@supabase/ssr).

## Live

- **Prod:** https://tambayan-red.vercel.app
- **Repo:** https://github.com/nicolasricbryant-blip/Pancit-Hackthon (branch `master`)
- **Vercel:** project `tambayan` (org nicolasricbryant-9459). **`vercel --prod --yes` from the CLI builds AND aliases `tambayan-red.vercel.app` directly** — the old "git push = Preview only, promote manually" step did NOT recur this session. Env vars set (prod/preview/dev): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Supabase:** ref `didlozqquuszabfbznll`. GitHub-connected → `supabase/migrations/*` auto-apply on push (all idempotent). Migrations also applied live this session via Management API (`api.supabase.com/v1/projects/<ref>/database/query`, needs a browser-ish `User-Agent` or Cloudflare 403s).

## Wave 4 — SHIPPED + DEPLOYED (2026-09-08, commits `9beb817` + `f1fdaab`, pushed + live)

De-slop redesign toward a native-app feel + two new features. Grounded in real peers (AcadArena, start.gg, Faceit, VLR.gg) + user mockups.

### Shell redesign
- **Bottom tab bar (mobile) / left rail (desktop)** — `AppNav` renders `TAB_NAV` (Scrims · Ladder→/leaderboards · Teams · Events · More). Everything else lives on **`/more`** (server page, role-filtered from `PRIMARY_NAV` minus `TAB_HREFS`).
- **Game context band** (`GameBand.tsx`, client) under the slim top bar — sticky, full-width, background = a dim tint of the active game hue (`--game-<id>-band`), retints on `?game=` change. Holds the restyled full-width segmented `GameSwitcher`.
- Top bar slimmed to wordmark + `ThemeToggle` + `ProfileMenu`.

### Light / dark theme
- **`tokens.css` rebuilt**: bare `:root` = LIGHT (blue/white) default. Dark = `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` + `:root[data-theme="dark"]`. Only colour tokens swap; space/type/radius/etc theme-invariant.
- **`ThemeToggle.tsx`** in the header — `useSyncExternalStore`, writes `data-theme` on `<html>`, persists `localStorage['tambayan-theme']`, forced choice wins over OS both ways.
- **Anti-flash**: plain `<script>` in `<head>` in `layout.tsx` reads localStorage pre-paint. (React dev-only warns "script tag while rendering" — harmless, absent in prod build. Stale-tab console spew during dev is dead-HMR-socket buffer, not real — a fresh tab + the prod build are clean.)
- `viewport.colorScheme = "light dark"`, dual `themeColor`.
- New tokens: `--color-primary/-hi/-ink` (flat blue), `--medal-1/2/3`, `--radius-xl`, shell metrics (`--header-h/--tabbar-h/--rail-w`), per-game `--game-*-band`.

### Scrim Finder home (`/`)
- `FinderHero` strip replaces the `page-title`/`page-sub` template.
- `TeamCrest` initials monogram on every card. Honest **time pill** (TONIGHT highlighted vs the window label — NO fabricated slot counts, no data for them). 2-up stat tiles (Rating / Reliability, mono). Chip-first `FilterBar` (time window = segmented chips; rank + format = compact selects). Request button now `--color-primary` (blue), not the game hue. Card hover = border/bg shift, no translateY.

### Profile (`/profile`) + avatars
- New `/profile` screen: identity header w/ avatar, role chips, 3 stat tiles (Scrims/Wins/WinRate — **all `—`, no per-player source in schema**), tabs **Game Profiles | Account**.
- `AvatarUpload.tsx` — validates image ≤2MB, uploads to Storage `avatars/<uid>/…`, sets `profiles.avatar_url`, `router.refresh()`. Wired into `ProfileMenu` (replaces initials).
- `game_profiles` cards now carry: **`MainRolePicker`** (multi-select from `GAMES[].roles`, saves `game_profiles.main_roles`) + **`AutoJoinControl`** (toggle → `enable_autojoin` RPC with rank/mode/mic settings).
- Migration `20260908010012_storage_avatars.sql` — public `avatars` bucket, owner-scoped writes. (`profiles.avatar_url` already existed.)

### Lobbies + role-based auto-join matchmaking
Pickup groups for ranked/casual — distinct from Scrims (team-v-team) and Free Agents (roster recruitment).
- **Migration `20260908010013_lobbies.sql`** (applied live): `lobbies`, `lobby_members`, `lobby_autojoin_prefs`, `game_profiles.main_roles`. Triggers: host auto-added on lobby insert; `lobbies.status` auto-syncs open↔full on member change; a freed slot re-runs the matchmaker. RPCs: `run_lobby_matchmaker` (role overlap OR either side has `Flex` + rank range via `games.rank_tiers` index + mode + mic), `enable_autojoin` (upsert prefs + back-scan ≤20 open lobbies), `lobby_accept_match` (ready-check accept), `expire_stale_lobbies` (lazy housekeeping, called from `/lobbies` server component), `lobby_rank_ok` (helper). Owner INSERT/UPDATE RLS added to `game_profiles`.
- **Auto-join model** (user-chosen): **ready-check**. Matched player is inserted `state='pending'` with `ready_by = now()+60s`; `/lobbies/[id]` shows "matched as {role} — Ready / Not now" + countdown. Ready → `lobby_accept_match`. Decline/timeout → row deleted (RLS self-delete), matchmaker refills.
- **Roles** in `config.ts` per game (`GAMES[].roles`), each ending in `Flex` (matches any needed role).
- UI: `/lobbies` (game-scoped list, mode + fits-my-role filters, `expire_stale_lobbies` on load), `/lobbies/new` (host form), `/lobbies/[id]` (roster, join/leave, host close+remove, ready-check, 10s `router.refresh()` poll). `/lobbies` in `PRIMARY_NAV` → shows under **More**.

## DB — 26 tables + views + RLS. Migrations `…010001`–`…010013`.
- 12 storage_avatars · 13 lobbies (see above). Types regenerated → `src/lib/db/types.ts` (via Management API `/types/typescript`).
- Build: `npx tsc --noEmit && npm run lint && npm run build` — all green as of `f1fdaab`. Prod build compiles all 40 routes clean.

## STILL OPEN / NEXT

- **UNTESTED — needs a human signed-in pass** (Claude can't auth): sign-in E2E, avatar upload, create lobby → join → leave, host close/remove, the 60s ready-check, `MainRolePicker` save, `AutoJoinControl` toggle + the matchmaker actually placing someone. All compile + the prod build passes; runtime behaviour of the authed paths is unverified.
- **ROTATE THE SUPABASE PAT** — a `sbp_…` token was pasted in chat AGAIN this session (4th time) and used for migrations 12/13 + type regen. Supabase → Account → Access Tokens → revoke. Store the next one in `.env.local` (git-ignored), never chat.
- Player leaderboard + profile stat tiles: still no per-player Scrims/Wins/WinRate source. Add a `player_match_stats` view/table if those tiles should show real numbers.
- Desktop shell polish: the wordmark sits alone top-left above the rail (reads as a logo lockup — acceptable, could move into the rail). "Sign in" button uses default styling.
- Realtime for `/lobbies/[id]` — currently a 10s `router.refresh()` poll; swap to a Supabase Realtime subscription on `lobby_members` if it feels laggy.
- Matchmaker runs synchronously in triggers/RPCs (no worker). Fine at pilot scale; revisit if lobby volume grows.
- `src/features/scrims/SkeletonCard.tsx` — rebuilt to match the new card; still only used by the (now unused post-live-wire) skeleton path.

## Build/run

```
npm run dev        # localhost:3000
npm run build      # turbopack prod build (all 40 routes)
vercel --prod --yes   # build + deploy + alias tambayan-red.vercel.app
```
`.env.local` has live Supabase anon creds (git-ignored). Admin ops go through the Management API with a PAT (no service_role key stored).
