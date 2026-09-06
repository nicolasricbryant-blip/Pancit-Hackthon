import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/features/auth/session";
import { canManageOrg, getOrgBySlug } from "@/features/orgs/queries";
import { OrgProfileView } from "@/features/orgs/OrgProfileView";
import { KIND_LABEL } from "@/features/orgs/types";
import styles from "@/features/orgs/orgs.module.css";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Org not found" };
  return {
    title: org.name,
    description: `${KIND_LABEL[org.kind]}${org.region ? ` · ${org.region}` : ""}`,
  };
}

export default async function OrgProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const user = await getUser();
  const canManage = canManageOrg(user?.id, org);

  return (
    <div className={styles.wrap}>
      <OrgProfileView org={org} canManage={canManage} />
    </div>
  );
}
