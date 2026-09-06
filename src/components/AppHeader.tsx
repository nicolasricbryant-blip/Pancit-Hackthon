import Link from "next/link";
import { Suspense } from "react";
import { GameSwitcher } from "./GameSwitcher";

/**
 * Sticky app shell header: wordmark · game switcher · profile avatar.
 * Present on every screen.
 */
export function AppHeader() {
  return (
    <header className="app-header">
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
    </header>
  );
}
