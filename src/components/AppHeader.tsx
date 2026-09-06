import Link from "next/link";
import { Suspense } from "react";
import { GameSwitcher } from "./GameSwitcher";
import { AppNav } from "./AppNav";
import { ProfileMenu } from "./ProfileMenu";
import { getCurrentProfile } from "@/features/auth/session";
import { navRoles } from "@/features/auth/roles";

/**
 * Sticky app shell: top bar (wordmark · game switcher · profile) + primary nav strip.
 * Present on every screen. The profile menu and role-gated nav read the current
 * profile (shared via React `cache()` with the root layout — one query per request).
 */
export async function AppHeader() {
  const profile = await getCurrentProfile();
  const roles = navRoles(profile);

  return (
    <header className="app-header-wrap">
      <div className="app-header">
        <Link href="/" className="wordmark">
          TAMBAYAN
        </Link>

        <div className="header-center">
          <Suspense fallback={<div className="game-switcher" aria-hidden />}>
            <GameSwitcher />
          </Suspense>
        </div>

        <ProfileMenu
          user={
            profile
              ? {
                  displayName: profile.display_name ?? "Player",
                  handle: profile.handle,
                }
              : null
          }
        />
      </div>

      <Suspense fallback={<div className="app-nav" aria-hidden />}>
        <AppNav roles={roles} />
      </Suspense>
    </header>
  );
}
