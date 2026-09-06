import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { canManageOrg, getOrgBySlug, listSchools } from "@/features/orgs/queries";
import {
  ManageOrgClient,
  ManageHeader,
} from "@/features/orgs/ManageOrgClient";
import styles from "@/features/orgs/orgs.module.css";

export const metadata: Metadata = { title: "Manage org" };

type Params = Promise<{ slug: string }>;

export default async function ManageOrgPage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = await requireProfile(`/orgs/${slug}/manage`);
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  if (!canManageOrg(profile.id, org)) {
    return (
      <div className={styles.wrap}>
        <div className={styles.gate}>
          <h1 className={styles.gateTitle}>Not your org</h1>
          <p className={styles.gateText}>
            Only an org owner or admin can manage its details and members.
          </p>
          <Link href={`/orgs/${org.slug}`} className={styles.gateLink}>
            View org
          </Link>
        </div>
      </div>
    );
  }

  const schools = await listSchools();

  return (
    <div className={styles.wrap}>
      <ManageHeader org={org} />
      <ManageOrgClient org={org} schools={schools} />
    </div>
  );
}
