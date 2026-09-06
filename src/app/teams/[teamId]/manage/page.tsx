import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getTeamProfile, listSchools } from "@/features/teams/queries";
import {
  ManageTeamClient,
  ManageHeader,
} from "@/features/teams/ManageTeamClient";
import styles from "@/features/teams/teams.module.css";

export const metadata: Metadata = { title: "Manage team" };

export default async function ManageTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const profile = await requireProfile(`/teams/${teamId}/manage`);
  const team = await getTeamProfile(teamId);
  if (!team) notFound();

  if (team.handlerId !== profile.id) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
          <h1 className={styles.gateTitle}>Not your team</h1>
          <p className={styles.gateText}>
            Only the team&apos;s handler can manage its details and roster.
          </p>
          <Link href={`/teams/${team.id}`} className={styles.gateLink}>
            View team
          </Link>
        </div>
      </div>
    );
  }

  const schools = await listSchools();

  return (
    <div className={styles.wrap}>
      <ManageHeader team={team} />
      <ManageTeamClient team={team} schools={schools} />
    </div>
  );
}
