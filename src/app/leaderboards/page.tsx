import { Suspense } from "react";
import type { Metadata } from "next";
import { coerceGameId, getGame } from "@/features/games/config";
import {
  coerceBoard,
  coerceSort,
  coerceStr,
} from "@/features/leaderboards/types";
import { getRegions, getSchools } from "@/features/leaderboards/queries";
import { LeaderboardControls } from "@/features/leaderboards/LeaderboardControls";
import { TeamBoard } from "@/features/leaderboards/TeamBoard";
import { PlayerBoard } from "@/features/leaderboards/PlayerBoard";
import { TableSkeleton } from "@/features/leaderboards/TableSkeleton";

export const metadata: Metadata = { title: "Leaderboards" };

type SearchParams = Record<string, string | string[] | undefined>;

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);
  const board = coerceBoard(sp.board);
  const sort = coerceSort(sp.sort);
  const region = coerceStr(sp.region);
  const school = coerceStr(sp.school);

  const [regions, schools] = await Promise.all([
    getRegions(board, game),
    getSchools(),
  ]);

  // Hand the selected game's hue down to the table accent + toggles.
  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  // Re-mount the Suspense boundary (fresh skeleton) whenever the query changes.
  const boardKey = `${board}:${game}:${sort}:${region}:${school}`;

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <h1 className="page-title">Leaderboards</h1>
        <p className="page-sub">
          {config.label} — team and player standings across the TAMBAYAN scrim
          network. Toggle between skill rating and community standing.
        </p>

        <LeaderboardControls
          board={board}
          sort={sort}
          region={region}
          school={school}
          regions={regions}
          schools={schools}
        />

        <Suspense key={boardKey} fallback={<TableSkeleton board={board} />}>
          {board === "player" ? (
            <PlayerBoard
              game={game}
              sort={sort}
              region={region}
              school={school}
            />
          ) : (
            <TeamBoard
              game={game}
              sort={sort}
              region={region}
              school={school}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
