import Link from "next/link";
import styles from "@/features/orgs/orgs.module.css";

export default function OrgNotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.gate}>
        <h1 className={styles.gateTitle}>Org not found</h1>
        <p className={styles.gateText}>
          This org doesn&apos;t exist or was removed.
        </p>
        <Link href="/orgs" className={styles.gateLink}>
          Browse orgs
        </Link>
      </div>
    </div>
  );
}
