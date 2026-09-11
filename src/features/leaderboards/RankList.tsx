import Link from "next/link";
import type { GameId } from "@/features/games/config";
import type { BoardKind, PlayerRow, TeamRow } from "./types";
import { getTeamRows, getPlayerRows } from "./queries";
import styles from "./leaderboards.module.css";

interface Props {
  game: GameId;
  board: BoardKind;
}

/** No region/school narrowing here — this is the compact mobile "Teams" tab; the
 * full filterable table still lives at /leaderboards. */
const DEFAULT_FILTERS = { region: "", school: "", sort: "rating" as const };

const MEDAL_CLASS = [styles.medalGold, styles.medalSilver, styles.medalBronze];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

function RankRowBody({
  rank,
  name,
  tag,
  sub,
  rating,
}: {
  rank: number;
  name: string;
  tag?: string | null;
  sub: string;
  rating: number;
}) {
  return (
    <>
      <span className={`${styles.rankNo} ${MEDAL_CLASS[rank] ?? ""}`}>
        {rank + 1}
      </span>
      <span className={styles.rankCrest} aria-hidden>
        {initials(name)}
      </span>
      <span className={styles.rankWho}>
        <span className={styles.rankName}>
          {name}
          {tag ? <span className={styles.rankTag}> {tag}</span> : null}
        </span>
        <span className={styles.rankSub}>{sub}</span>
      </span>
      <span className={styles.rankRating}>{Math.round(rating)}</span>
    </>
  );
}

function RankTeamList({ rows }: { rows: TeamRow[] }) {
  if (rows.length === 0) {
    return (
      <div className={styles.rankEmpty}>
        <p>No teams match yet.</p>
      </div>
    );
  }
  return (
    <ul className={styles.rankListWrap}>
      {rows.map((row, i) => (
        <li key={row.teamId}>
          <Link href={`/teams/${row.teamId}`} className={styles.rankRow}>
            <RankRowBody
              rank={i}
              name={row.name}
              tag={row.tag}
              sub={row.schoolShort ?? row.region ?? "—"}
              rating={row.rating}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RankPlayerList({ rows }: { rows: PlayerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className={styles.rankEmpty}>
        <p>Player ratings populate once scrims are played.</p>
      </div>
    );
  }
  return (
    <ul className={styles.rankListWrap}>
      {rows.map((row, i) => (
        <li key={row.profileId} className={styles.rankRow}>
          <RankRowBody
            rank={i}
            name={row.displayName}
            sub={row.schoolShort ?? row.rankLabel ?? "—"}
            rating={row.rating}
          />
        </li>
      ))}
    </ul>
  );
}

/** Async server view — mobile card list for the Teams tab (Team / Player toggle). */
export async function RankList({ game, board }: Props) {
  if (board === "player") {
    const rows = await getPlayerRows(game, DEFAULT_FILTERS);
    return <RankPlayerList rows={rows} />;
  }
  const rows = await getTeamRows(game, DEFAULT_FILTERS);
  return <RankTeamList rows={rows} />;
}
