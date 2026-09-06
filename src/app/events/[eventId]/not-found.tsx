import Link from "next/link";
import styles from "@/features/events/events.module.css";

export default function EventNotFound() {
  return (
    <div className={styles.detailWrap}>
      <div className={styles.empty}>
        <p>That event doesn&apos;t exist or was removed.</p>
        <Link href="/events" className={styles.emptyCta}>
          Browse events
        </Link>
      </div>
    </div>
  );
}
