import type { Metadata } from "next";
import Link from "next/link";
import {
  coerceGameId,
  GAMES,
  getGame,
  isGameId,
} from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { getMyRequests, getOpenRequests } from "@/features/mentorship/queries";
import { MyRequestCard } from "@/features/mentorship/MyRequestCard";
import { OpenRequestCard } from "@/features/mentorship/OpenRequestCard";
import styles from "@/features/mentorship/mentorship.module.css";

export const metadata: Metadata = { title: "Mentorship" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function MentorshipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfile("/mentorship");

  const sp = await searchParams;
  const rawGame = Array.isArray(sp.game) ? sp.game[0] : sp.game;
  const filterGame = isGameId(rawGame) ? rawGame : undefined;
  const scopeGame = coerceGameId(sp.game);
  const config = getGame(scopeGame);

  const [mine, open] = await Promise.all([
    getMyRequests(),
    getOpenRequests(filterGame),
  ]);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${scopeGame})`,
    "--game-current-dim": `var(--game-${scopeGame}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={scopeGame}>
      <div className="page-wrap">
        <div className={styles.headRow}>
          <div>
            <h1 className="page-title">Mentorship</h1>
            <p className="page-sub">
              Newer players ask for VOD reviews, coaching, or a steer in the right
              direction. Veterans and handlers take the requests they can cover.
            </p>
          </div>
          <Link href="/mentorship/new" className={styles.newBtn}>
            Request mentorship
          </Link>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your requests</h2>
          {mine.length === 0 ? (
            <div className="empty-state">
              <p>
                No requests yet. Ask for a hand — someone here has been where you
                are.
              </p>
              <Link href="/mentorship/new" className={styles.newBtn}>
                Request mentorship
              </Link>
            </div>
          ) : (
            <div className={styles.stack}>
              {mine.map((r) => (
                <MyRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Open requests you could take</h2>
            <form className={styles.filter} method="get">
              <label className="filter-label" htmlFor="mentorship-game">
                Game
              </label>
              <select
                id="mentorship-game"
                name="game"
                className="filter-select"
                defaultValue={filterGame ?? ""}
              >
                <option value="">All games</option>
                {GAMES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.btnGhost}>
                Filter
              </button>
            </form>
          </div>
          {open.length === 0 ? (
            <div className="empty-state">
              <p>
                No open requests
                {filterGame ? ` for ${config.label}` : ""} right now. Check back
                later.
              </p>
            </div>
          ) : (
            <div className="feed-grid">
              {open.map((r) => (
                <OpenRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
