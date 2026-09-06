import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { listTournamentsForGame } from "@/features/brackets/queries";
import { TournamentCard } from "@/features/brackets/TournamentCard";
import styles from "@/features/brackets/brackets.module.css";

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export const metadata: Metadata = {
  title: "Brackets",
  description: "Single-elimination collegiate tournaments.",
};

export default async function BracketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);
  const tournaments = await listTournamentsForGame(game);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <div className={styles.headRow}>
          <div>
            <h1 className="page-title">Brackets</h1>
            <p className="page-sub">
              Single-elimination tournaments in {config.label}. Newest first.
            </p>
          </div>
          <Link href={`/brackets/new?game=${game}`} className={styles.hostBtn}>
            Host a tournament
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p>No tournaments yet in {config.label}.</p>
            <Link href={`/brackets/new?game=${game}`} className={styles.hostBtn}>
              Host the first one
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
