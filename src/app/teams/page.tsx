import type { Metadata } from "next";
import { coerceGameId, getGame } from "@/features/games/config";
import {
  listTeamsForGame,
  regionsOf,
  schoolsOf,
} from "@/features/teams/queries";
import { TeamsBrowser } from "@/features/teams/TeamsBrowser";
import styles from "@/features/teams/teams.module.css";

export const metadata: Metadata = { title: "Teams" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);
  const teams = await listTeamsForGame(game);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Teams</h1>
        <p className={styles.sub}>
          Every {config.label} team on the network. Open a profile for the full
          competitive and community record.
        </p>
        <TeamsBrowser
          key={game}
          teams={teams}
          regions={regionsOf(teams)}
          schools={schoolsOf(teams)}
          gameLabel={config.label}
        />
      </div>
    </div>
  );
}
