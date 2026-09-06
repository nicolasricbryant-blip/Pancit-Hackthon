import styles from "@/features/events/events.module.css";

function SkeletonCard() {
  return (
    <div className={styles.skCard}>
      <div className={`${styles.skPill} ${styles.shimmer}`} />
      <div className={`${styles.skLine} ${styles.lg} ${styles.shimmer}`} />
      <div className={`${styles.skLine} ${styles.sm} ${styles.shimmer}`} />
      <div className={`${styles.skLine} ${styles.shimmer}`} />
    </div>
  );
}

export default function LoadingEvents() {
  return (
    <div className={styles.wrap}>
      <div className={`${styles.skLine} ${styles.lg} ${styles.shimmer}`} />
      <div className={styles.layout} style={{ marginTop: "var(--space-lg)" }}>
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className={styles.annBoard}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.annRow}>
              <div className={`${styles.skLine} ${styles.sm} ${styles.shimmer}`} />
              <div className={`${styles.skLine} ${styles.shimmer}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
