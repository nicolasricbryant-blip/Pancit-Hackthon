import Link from "next/link";
import type { EventsFeed as FeedData } from "./queries";
import { EventCard } from "./EventCard";
import styles from "./events.module.css";

/** Upcoming feed + collapsed past section. Co-equal weight with the Scrim Finder. */
export function EventsFeed({ feed }: { feed: FeedData }) {
  const { upcoming, past } = feed;

  return (
    <div className={styles.main}>
      <p className={styles.sectionLabel}>Upcoming</p>

      {upcoming.length === 0 ? (
        <div className={styles.empty}>
          <p>No events yet — host one.</p>
          <Link href="/events/new" className={styles.emptyCta}>
            Host an event
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details className={styles.pastWrap}>
          <summary className={styles.pastSummary}>
            Past events ({past.length})
          </summary>
          <div className={`${styles.list} ${styles.pastList}`}>
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
