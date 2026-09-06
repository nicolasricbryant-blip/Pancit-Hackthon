import Link from "next/link";
import type { GameId } from "@/features/games/config";
import type { SortKey } from "./types";
import { getTeamRows } from "./queries";
import { Empty } from "./Empty";
import styles from "./leaderboards.module.css";

interface Props {
  game: GameId;
  sort: SortKey;
  region: string;
  school: string;
}

/** Async server view — team standings table for the selected game + filters. */
export async function TeamBoard({ game, sort, region, school }: Props) {
  const rows = await getTeamRows(game, { region, school, sort });

  if (rows.length === 0) {
    return <Empty message="No teams match these filters." />;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rankCol}>#</th>
            <th>Team</th>
            <th>School</th>
            <th>Region</th>
            <th className={styles.num}>Rating</th>
            <th className={styles.num}>W&ndash;L</th>
            <th className={styles.num}>Reliability</th>
            <th className={styles.num}>Standing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.teamId}
              className={styles.row}
              data-top={i < 3 ? "true" : undefined}
            >
              <td className={styles.rank}>{i + 1}</td>
              <td className={styles.nameCell}>
                <Link href={`/teams/${row.teamId}`} className={styles.rowLink}>
                  {row.name}
                  {row.tag ? <span className={styles.tag}> {row.tag}</span> : null}
                </Link>
              </td>
              <td>{row.schoolShort ?? "—"}</td>
              <td>{row.region ?? "—"}</td>
              <td className={styles.num}>{Math.round(row.rating)}</td>
              <td className={styles.num}>
                {row.wins}&ndash;{row.losses}
              </td>
              <td className={styles.num}>
                {row.reliability != null
                  ? `${Math.round(row.reliability)}%`
                  : "—"}
              </td>
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
