import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId } from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { isHandler } from "@/features/auth/roles";
import { listSchools } from "@/features/teams/queries";
import { NewTeamForm } from "@/features/teams/NewTeamForm";
import styles from "@/features/teams/teams.module.css";

export const metadata: Metadata = { title: "New team" };

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile("/teams/new");

  if (!isHandler(profile)) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
          <h1 className={styles.gateTitle}>Team Handler role required</h1>
          <p className={styles.gateText}>
            Switch on the Team Handler role in Settings to create a team.
          </p>
          <Link href="/settings" className={styles.gateLink}>
            Open Settings
          </Link>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const defaultGame = coerceGameId(sp.game);
  const schools = await listSchools();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Create a team</h1>
      <p className={styles.sub}>
        You&apos;ll be seated as captain. Rating, reliability, and standing start
        at their baselines.
      </p>
      <NewTeamForm schools={schools} defaultGame={defaultGame} />
    </div>
  );
}
