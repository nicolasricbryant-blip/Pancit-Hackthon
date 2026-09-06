import type { GameId } from "@/features/games/config";
import type { SortKey } from "./types";
import { getPlayerRows } from "./queries";
import { Empty } from "./Empty";
import styles from "./leaderboards.module.css";

interface Props {
  game: GameId;
  sort: SortKey;
  region: string;
  school: string;
}

function VerifiedMark() {
  return (
    <span className={styles.verified} title="Verified rank" aria-label="Verified">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 7.9l1.6 1.6 3-3.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Async server view — player standings for the selected game + filters.
 *
 * No player (profile_id) ratings are seeded yet, so this renders a clean empty
 * state today; the query + table below are complete and light up the moment
 * `ratings` gains profile rows for a game.
 */
export async function PlayerBoard({ game, sort, region, school }: Props) {
  const rows = await getPlayerRows(game, { region, school, sort });

  if (rows.length === 0) {
    return <Empty message="Player ratings populate once scrims are played." />;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rankCol}>#</th>
            <th>Player</th>
            <th>School</th>
            <th>Rank</th>
            <th className={styles.num}>Rating</th>
            <th className={styles.num}>Standing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.profileId}
              className={styles.row}
              data-top={i < 3 ? "true" : undefined}
            >
              <td className={styles.rank}>{i + 1}</td>
              <td>
                <span className={styles.playerName}>{row.displayName}</span>
                {row.handle ? (
                  <span className={styles.handle}> @{row.handle}</span>
                ) : null}
              </td>
              <td>{row.schoolShort ?? "—"}</td>
              <td>
                {row.rankLabel ?? "—"}
                {row.verified ? <VerifiedMark /> : null}
              </td>
              <td className={styles.num}>{Math.round(row.rating)}</td>
              <td className={styles.num}>
                {row.standing != null ? row.standing : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
