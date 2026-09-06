import Link from "next/link";
import styles from "@/features/teams/teams.module.css";

export default function TeamNotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.gate}>
        <h1 className={styles.gateTitle}>Team not found</h1>
        <p className={styles.gateText}>
          This team doesn&apos;t exist or was removed.
        </p>
        <Link href="/teams" className={styles.gateLink}>
          Browse teams
        </Link>
      </div>
    </div>
  );
}
