import type { Metadata } from "next";
import Link from "next/link";
import { listOrgs, regionsOf } from "@/features/orgs/queries";
import { OrgsBrowser } from "@/features/orgs/OrgsBrowser";
import styles from "@/features/orgs/orgs.module.css";

export const metadata: Metadata = { title: "Orgs" };

export default async function OrgsPage() {
  const orgs = await listOrgs();

  return (
    <div className={styles.wrap}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.title}>Orgs</h1>
          <p className={styles.sub}>
            Varsity programs, community orgs, collegiate leagues, and content
            crews across the PH collegiate scene.
          </p>
        </div>
        <Link href="/orgs/new" className={styles.newBtn}>
          Register an org
        </Link>
      </div>
      <OrgsBrowser orgs={orgs} regions={regionsOf(orgs)} />
    </div>
  );
}
