import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { getCurrentProfile } from "@/features/auth/session";

/**
 * Slim top bar: wordmark (home link) on the left, profile menu on the right.
 * Sticky on every screen. The game selector now lives in <GameBand>, and the
 * primary nav is the bottom tab bar / left rail (<AppNav>) — both rendered by
 * the root layout, not here.
 *
 * `restricted` is set by the layout while the onboarding gate is active: every
 * route but /onboarding and /auth/* 307s straight back there, so the wordmark
 * must not link to / (dead tap) and the profile menu must not offer
 * "My Profile" / "Settings" (both are trapped routes too) — only Sign out.
 */
export async function AppHeader({ restricted = false }: { restricted?: boolean } = {}) {
  const profile = await getCurrentProfile();

  const brand = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark-light-theme.png"
        alt=""
        className="wordmark-icon wordmark-icon--light"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark-dark-theme.png"
        alt=""
        className="wordmark-icon wordmark-icon--dark"
      />
      TAMBAYAN
    </>
  );

  return (
    <header className="app-header">
      {restricted ? (
        <span className="wordmark" aria-disabled="true">
          {brand}
        </span>
      ) : (
        <Link href="/" className="wordmark">
          {brand}
        </Link>
      )}

      <div className="app-header-right">
        <ThemeToggle />
        <ProfileMenu
          restricted={restricted}
          user={
            profile
              ? {
                  displayName: profile.display_name ?? "Player",
                  handle: profile.handle,
                  avatarUrl: profile.avatar_url ?? null,
                }
              : null
          }
        />
      </div>
    </header>
  );
}
