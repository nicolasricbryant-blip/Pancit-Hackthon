import Link from "next/link";
import styles from "@/features/brackets/brackets.module.css";

export default function TournamentNotFound() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Tournament not found</h1>
      <p className={styles.sub}>
        This tournament doesn&apos;t exist or was removed.
      </p>
      <Link href="/brackets" className={styles.manageLink}>
        Browse tournaments
      </Link>
    </div>
  );
}
