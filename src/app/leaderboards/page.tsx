import { Suspense } from "react";
import type { Metadata } from "next";
import { coerceGameId, getGame } from "@/features/games/config";
import {
  coerceBoard,
  coerceScope,
  coerceSort,
  coerceStr,
} from "@/features/leaderboards/types";
import { getRegions, getSchools } from "@/features/leaderboards/queries";
import { LeaderboardControls } from "@/features/leaderboards/LeaderboardControls";
import { TeamBoard } from "@/features/leaderboards/TeamBoard";
import { PlayerBoard } from "@/features/leaderboards/PlayerBoard";
import { TableSkeleton } from "@/features/leaderboards/TableSkeleton";
import { getCurrentProfile } from "@/features/auth/session";
import styles from "@/features/leaderboards/leaderboards.module.css";

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
  const scope = coerceScope(sp.scope);
  const region = coerceStr(sp.region);
  const school = coerceStr(sp.school);

  const [regions, schools, profile] = await Promise.all([
    getRegions(board, game),
    getSchools(),
    getCurrentProfile(),
  ]);

  // ── Scope → region/school predicate ────────────────────────────────────────
  // The board queries already narrow by `region` / `school`; scope decides which
  // values (if any) to feed them, layered over the manual selects.
  const signedIn = profile != null;
  const profileRegion = profile?.region ?? "";
  const profileSchool = profile?.school_id ?? "";
  const canRegional = profileRegion !== "";
  const canSchool = profileSchool !== "";

  let effRegion = "";
  let effSchool = "";
  let scopeNote: string | null = null;

  if (scope === "regional") {
    const target = region || profileRegion; // explicit pick wins, else own region
    if (target) {
      effRegion = target;
    } else {
      scopeNote = signedIn
        ? "No region on your profile yet — showing nationwide."
        : "Sign in to filter by your region — showing nationwide.";
    }
  } else if (scope === "school") {
    if (profileSchool) {
      effSchool = profileSchool;
    } else {
      scopeNote = signedIn
        ? "No school on your profile yet — showing nationwide."
        : "Sign in to filter by your school — showing nationwide.";
    }
  } else {
    // nationwide — manual selects still apply
    effRegion = region;
    effSchool = school;
  }

  // Hand the selected game's hue down to the table accent + toggles.
  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  // Re-mount the Suspense boundary (fresh skeleton) whenever the query changes.
  const boardKey = `${board}:${game}:${sort}:${scope}:${effRegion}:${effSchool}`;

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
          scope={scope}
          region={region}
          school={school}
          regions={regions}
          schools={schools}
          signedIn={signedIn}
          canRegional={canRegional}
          canSchool={canSchool}
        />

        {scopeNote ? <p className={styles.note}>{scopeNote}</p> : null}

        <Suspense key={boardKey} fallback={<TableSkeleton board={board} />}>
          {board === "player" ? (
            <PlayerBoard
              game={game}
              sort={sort}
              region={effRegion}
              school={effSchool}
            />
          ) : (
            <TeamBoard
              game={game}
              sort={sort}
              region={effRegion}
              school={effSchool}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
