import type { Metadata } from "next";
import { coerceGameId } from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { CreateLobbyForm } from "@/features/lobbies/CreateLobbyForm";
import styles from "../lobbies.module.css";

export const metadata: Metadata = { title: "Host a lobby" };

type ScopeVars = React.CSSProperties & Record<`--${string}`, string>;

export default async function NewLobbyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  await requireProfile("/lobbies/new");

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" data-game={game} style={scopeStyle}>
      <div className={styles.formWrap}>
        <div>
          <h1 className="page-title">Host a lobby</h1>
          <p className="page-sub">
            Open a pickup party and let players fill your empty slots. Opted-in
            players get a 60-second ready-check when they match.
          </p>
        </div>

        <CreateLobbyForm game={game} />
      </div>
    </div>
  );
}
