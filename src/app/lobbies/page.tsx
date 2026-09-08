import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/auth/session";
import { listLobbies } from "@/features/lobbies/queries";
import { LobbyFeed } from "@/features/lobbies/LobbyCard";
import styles from "./lobbies.module.css";

export const metadata: Metadata = { title: "Lobbies" };

type ScopeVars = React.CSSProperties & Record<`--${string}`, string>;

export default async function LobbiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const label = getGame(game).label;

  const rows = await listLobbies(game);

  // Signed-in viewers get the "fits my role" toggle, seeded from their main
  // roles for this game.
  const profile = await getCurrentProfile();
  let viewerRoles: string[] = [];
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("game_profiles")
      .select("main_roles")
      .eq("profile_id", profile.id)
      .eq("game_id", game)
      .maybeSingle();
    viewerRoles = data?.main_roles ?? [];
  }

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" data-game={game} style={scopeStyle}>
      <div className="page-wrap">
        <header className={styles.head}>
          <div>
            <h1 className="page-title">Lobbies</h1>
            <p className="page-sub">
              {rows.length} open in {label}
            </p>
          </div>
          <Link href={`/lobbies/new?game=${game}`} className={styles.hostBtn}>
            Host a lobby
          </Link>
        </header>

        <LobbyFeed
          key={game}
          rows={rows}
          label={label}
          viewerRoles={viewerRoles}
        />
      </div>
    </div>
  );
}
