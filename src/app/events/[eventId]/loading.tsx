import styles from "@/features/events/events.module.css";

export default function LoadingEventDetail() {
  return (
    <div className={styles.detailWrap}>
      <div className={`${styles.skLine} ${styles.sm} ${styles.shimmer}`} />
      <div className={styles.detailCard}>
        <div className={`${styles.skPill} ${styles.shimmer}`} />
        <div className={`${styles.skLine} ${styles.lg} ${styles.shimmer}`} />
        <div className={`${styles.skLine} ${styles.shimmer}`} />
        <div className={`${styles.skLine} ${styles.shimmer}`} />
        <div className={`${styles.skLine} ${styles.sm} ${styles.shimmer}`} />
      </div>
    </div>
  );
}
