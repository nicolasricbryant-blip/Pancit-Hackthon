import Link from "next/link";
import { pctText, ratingText, type TeamListItem } from "./types";
import styles from "./teams.module.css";

/** One team in the browse grid. Links to the team profile. */
export function TeamCard({ team }: { team: TeamListItem }) {
  const school = team.school?.short_name ?? team.school?.name ?? "Independent";
  return (
    <Link href={`/teams/${team.id}`} className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardName}>{team.name}</span>
        {team.tag && <span className={styles.cardTag}>{team.tag}</span>}
      </div>
      <div className={styles.cardMeta}>
        <span>{school}</span>
        {team.region && (
          <>
            <span className={styles.sep}>·</span>
            <span>{team.region}</span>
          </>
        )}
      </div>
      <div className={styles.statStrip}>
        <span>
          <span className={styles.statLabel}>RATING</span>
          <span className={styles.statNum}>{ratingText(team.rating)}</span>
        </span>
        <span className={styles.sep}>·</span>
        <span>
          <span className={styles.statLabel}>RELIABILITY</span>
          <span className={styles.statNum}>{pctText(team.reliability)}%</span>
        </span>
        <span className={styles.sep}>·</span>
        <span>
          <span className={styles.statLabel}>STANDING</span>
          <span className={styles.statNum}>{team.standing}</span>
          <span className={styles.statUnit}> pts</span>
        </span>
      </div>
    </Link>
  );
}
