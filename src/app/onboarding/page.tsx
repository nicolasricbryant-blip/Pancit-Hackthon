import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, getCurrentProfile } from "@/features/auth/session";
import { matchSchoolByEmail } from "@/features/auth/matchSchoolByEmail";
import { choiceFromRoles, type RoleChoice } from "@/features/auth/types";
import { OnboardingForm } from "./OnboardingForm";
import styles from "./onboarding.module.css";

export const metadata: Metadata = { title: "Set up your profile" };

const ROLE_VALUES: RoleChoice[] = ["player", "handler", "both"];

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/onboarding");

  const profile = await getCurrentProfile();
  // Already onboarded (school picked) → nothing to do here.
  if (profile?.school_id) redirect("/");

  const sp = await searchParams;
  const roleRaw = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const roleFromQuery = ROLE_VALUES.includes(roleRaw as RoleChoice)
    ? (roleRaw as RoleChoice)
    : null;

  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, short_name, region, email_domains")
    .order("name");

  const email = user.email ?? "";
  const matched = email ? await matchSchoolByEmail(email) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Set up your profile</h1>
        <p className={styles.sub}>
          One more step. Pick a handle, confirm your role, and link your school.
        </p>
      </div>

      <OnboardingForm
        email={email}
        initialHandle={profile?.handle ?? ""}
        initialDisplayName={profile?.display_name ?? ""}
        initialRole={roleFromQuery ?? choiceFromRoles(profile?.roles)}
        schools={schools ?? []}
        matchedSchoolId={matched?.id ?? null}
      />
    </div>
  );
}
