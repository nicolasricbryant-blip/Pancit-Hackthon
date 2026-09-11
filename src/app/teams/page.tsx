import type { Metadata } from "next";
import { coerceGameId, getGame } from "@/features/games/config";
import { coerceBoard } from "@/features/leaderboards/types";
import { RankBoardToggle } from "@/features/leaderboards/RankBoardToggle";
import { RankList } from "@/features/leaderboards/RankList";

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
  const board = coerceBoard(sp.board);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <h1 className="page-title">Teams</h1>
        <p className="page-sub">
          {config.label} standings across the TAMBAYAN network. Toggle Teams /
          Players, tap a team for its full competitive and community record.
        </p>

        <RankBoardToggle board={board} />
        <RankList key={`${board}:${game}`} game={game} board={board} />
      </div>
    </div>
  );
}
