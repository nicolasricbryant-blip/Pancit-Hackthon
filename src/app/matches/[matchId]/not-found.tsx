import Link from "next/link";
import { ROUTES } from "@/config/nav";
import styles from "@/features/matches/matches.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.empty}>
        <p>That match room doesn&apos;t exist or was cancelled.</p>
        <Link href={ROUTES.matches} className={styles.emptyLink}>
          Back to Match Room →
        </Link>
      </div>
    </div>
  );
}
