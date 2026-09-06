import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { coerceGameId, getGame } from "@/features/games/config";
import { getMatchesForProfile } from "@/features/matches/queries";
import { MatchList } from "@/features/matches/MatchList";
import styles from "@/features/matches/matches.module.css";

export const metadata: Metadata = { title: "Match Room" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile("/matches");
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);

  const { groups, total, hasTeams, teamIds } = await getMatchesForProfile(profile.id);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className={styles.wrap} style={scopeStyle} data-game={game}>
      <div className={styles.head}>
        <h1 className={styles.title}>Match Room</h1>
        <p className={styles.sub}>
          Your booked scrims, results awaiting confirmation, and history. Hue
          follows the {config.label} view.
        </p>
      </div>

      {!hasTeams && (
        <p className={styles.noteBanner}>
          You&apos;re not on a team yet — showing all scrims, read-only.
        </p>
      )}

      <MatchList groups={groups} total={total} myTeamIds={teamIds} />
    </div>
  );
}
