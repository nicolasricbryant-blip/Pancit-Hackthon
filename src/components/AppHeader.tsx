import Link from "next/link";
import { Suspense } from "react";
import { GameSwitcher } from "./GameSwitcher";
import { AppNav } from "./AppNav";

/**
 * Sticky app shell: top bar (wordmark · game switcher · profile) + primary nav strip.
 * Present on every screen. Auth replaces the static avatar with a real profile menu.
 */
export function AppHeader() {
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

        <div
          className="avatar"
          role="img"
          aria-label="Profile — JR"
          title="Profile"
        >
          JR
        </div>
      </div>

      <Suspense fallback={<div className="app-nav" aria-hidden />}>
        <AppNav />
      </Suspense>
    </header>
  );
}
