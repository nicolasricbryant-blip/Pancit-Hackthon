import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import {
  getOpenPostsForGame,
  getViewerId,
} from "@/features/free-agents/queries";
import { FreeAgentsBoard } from "@/features/free-agents/FreeAgentsBoard";
import styles from "@/features/free-agents/free-agents.module.css";

export const metadata: Metadata = { title: "Free Agents" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function FreeAgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);

  const [posts, viewerId] = await Promise.all([
    getOpenPostsForGame(game),
    getViewerId(),
  ]);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <div className={styles.headRow}>
          <div>
            <h1 className="page-title">Free Agents</h1>
            <p className="page-sub">
              Players without a roster and teams hunting a fifth in {config.label}.
              Filter by side and role, then reach out.
            </p>
          </div>
          <Link href="/free-agents/new" className={styles.newBtn}>
            Post a listing
          </Link>
        </div>

        <FreeAgentsBoard key={game} posts={posts} viewerId={viewerId} />
      </div>
    </div>
  );
}
