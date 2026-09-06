import Link from "next/link";
import { fmtDay } from "@/features/events/format";
import { SCOPE_LABEL, STATUS_LABEL, type TournamentListItem } from "./types";
import styles from "./brackets.module.css";

/** One tournament in the browse grid. Whole card links to the tournament page. */
export function TournamentCard({ t }: { t: TournamentListItem }) {
  const scope = SCOPE_LABEL[t.scope as keyof typeof SCOPE_LABEL] ?? t.scope;

  return (
    <Link href={`/brackets/${t.slug}`} className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardName}>{t.name}</span>
        <span className={styles.statusPill} data-status={t.status}>
          {STATUS_LABEL[t.status] ?? t.status}
        </span>
      </div>

      <div className={styles.cardMeta}>
        <span>{scope}</span>
        <span className={styles.sep}>·</span>
        <span>{t.size}-team</span>
        <span className={styles.sep}>·</span>
        <span>Single-elim</span>
        {t.region && (
          <>
            <span className={styles.sep}>·</span>
            <span>{t.region}</span>
          </>
        )}
      </div>

      <div className={styles.cardStats}>
        <span>
          <span className={styles.statLabel}>ENTRANTS</span>
          <span className={styles.statNum}>
            {t.entrantCount}/{t.size}
          </span>
        </span>
        <span className={styles.sep}>·</span>
        <span>
          <span className={styles.statLabel}>STARTS</span>
          <span className={styles.statNum}>{fmtDay(t.startsAt)}</span>
        </span>
        {t.champion && (
          <>
            <span className={styles.sep}>·</span>
            <span>
              <span className={styles.statLabel}>CHAMPION</span>
              <span className={styles.statNum}>{t.champion.name}</span>
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
