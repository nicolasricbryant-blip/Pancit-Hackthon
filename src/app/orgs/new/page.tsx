import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { listSchools } from "@/features/orgs/queries";
import { NewOrgForm } from "@/features/orgs/NewOrgForm";
import styles from "@/features/orgs/orgs.module.css";

export const metadata: Metadata = { title: "Register an org" };

export default async function NewOrgPage() {
  await requireProfile("/orgs/new");
  const schools = await listSchools();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Register an org</h1>
      <p className={styles.sub}>
        You&apos;ll be seated as the org owner. You can add members and link teams
        once it&apos;s live.
      </p>
      <NewOrgForm schools={schools} />
    </div>
  );
}
