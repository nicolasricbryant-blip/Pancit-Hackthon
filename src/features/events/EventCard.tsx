import Link from "next/link";
import { kindLabel, type EventView } from "./types";
import { fmtDay, fmtTimeRange } from "./format";
import styles from "./events.module.css";

const RSVP_PILL_LABEL: Record<string, string> = {
  going: "You're going",
  interested: "Interested",
  waitlist: "Waitlisted",
};

/** One event in the feed. Whole card links to the detail page. */
export function EventCard({ event }: { event: EventView }) {
  const {
    id,
    title,
    kind,
    is_physical,
    host_org,
    venue,
    region,
    starts_at,
    ends_at,
    capacity,
    goingCount,
    viewerStatus,
  } = event;

  const place = [venue, region].filter(Boolean).join(", ");

  return (
    <Link href={`/events/${id}`} className={styles.card}>
      <div className={styles.badgeRow}>
        <span className={styles.badge}>{kindLabel(kind)}</span>
        <span
          className={`${styles.tag} ${is_physical ? styles.tagPhysical : styles.tagOnline}`}
        >
          {is_physical ? "Physical" : "Online"}
        </span>
        {viewerStatus && viewerStatus !== "cancelled" && (
          <span className={styles.rsvpPill} data-status={viewerStatus}>
            {RSVP_PILL_LABEL[viewerStatus] ?? viewerStatus}
          </span>
        )}
      </div>

      <h3 className={styles.cardTitle}>{title}</h3>
      {host_org && <div className={styles.cardHost}>{host_org}</div>}

      <div className={styles.cardMeta}>
        <span>{fmtDay(starts_at)}</span>
        <span className={styles.sep}>·</span>
        <span>{fmtTimeRange(starts_at, ends_at)}</span>
        {is_physical && place && (
          <>
            <span className={styles.sep}>·</span>
            <span>{place}</span>
          </>
        )}
      </div>

      <div className={styles.cardStats}>
        <span>
          <span className={styles.statLabel}>GOING</span>
          {goingCount}
          {capacity ? ` / ${capacity}` : ""}
        </span>
        {capacity != null && (
          <span>
            <span className={styles.statLabel}>CAP</span>
            {capacity}
          </span>
        )}
      </div>
    </Link>
  );
}
