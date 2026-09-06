import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { SettingsForm } from "./SettingsForm";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireProfile("/settings");

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.sub}>Profile basics and exam-week status.</p>
      </div>

      <SettingsForm
        initialDisplayName={profile.display_name ?? ""}
        initialRegion={profile.region ?? ""}
        initialExamMode={profile.exam_mode}
        initialExamModeUntil={profile.exam_mode_until}
      />
    </div>
  );
}
