import type { AnnouncementRow } from "./types";
import { relativeTime } from "./format";
import styles from "./events.module.css";

/** Secondary panel: platform + game announcements, pinned first. */
export function AnnouncementsBoard({
  announcements,
}: {
  announcements: AnnouncementRow[];
}) {
  return (
    <aside className={styles.annBoard} aria-labelledby="ann-heading">
      <p className={styles.sectionLabel} id="ann-heading">
        Announcements
      </p>

      {announcements.length === 0 ? (
        <p className={styles.annEmpty}>Nothing posted yet.</p>
      ) : (
        announcements.map((a) => (
          <div className={styles.annRow} key={a.id}>
            <div className={styles.annTitleRow}>
              {a.pinned && (
                <span className={styles.annPin} aria-label="Pinned">
                  ▲
                </span>
              )}
              <span className={styles.annTitle}>{a.title}</span>
            </div>
            {a.body && <p className={styles.annBody}>{a.body}</p>}
            <span className={styles.annTime}>{relativeTime(a.created_at)}</span>
          </div>
        ))
      )}
    </aside>
  );
}
