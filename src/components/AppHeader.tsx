import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { getCurrentProfile } from "@/features/auth/session";

/**
 * Slim top bar: wordmark (home link) on the left, profile menu on the right.
 * Sticky on every screen. The game selector now lives in <GameBand>, and the
 * primary nav is the bottom tab bar / left rail (<AppNav>) — both rendered by
 * the root layout, not here.
 */
export async function AppHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="app-header">
      <Link href="/" className="wordmark">
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
      </Link>

      <div className="app-header-right">
        <ThemeToggle />
        <ProfileMenu
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
