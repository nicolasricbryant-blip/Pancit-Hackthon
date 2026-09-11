"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  choiceFromRoles,
  rolesFromChoice,
  type RoleChoice,
} from "@/features/auth/types";
import styles from "./settings.module.css";

interface Props {
  initialDisplayName: string;
  initialRegion: string;
  initialExamMode: boolean;
  initialExamModeUntil: string | null;
  initialRoles: string[];
}

const ROLE_OPTIONS: { value: RoleChoice; name: string; desc: string }[] = [
  { value: "player", name: "Player", desc: "Ranks, teams, browse and request scrims." },
  { value: "handler", name: "Team Handler", desc: "Run a roster, post listings, report results." },
  { value: "both", name: "Both — player-captain", desc: "Play and run your own team." },
];

export function SettingsForm({
  initialDisplayName,
  initialRegion,
  initialExamMode,
  initialExamModeUntil,
  initialRoles,
}: Props) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [region, setRegion] = useState(initialRegion);
  const [examMode, setExamMode] = useState(initialExamMode);
  const [examUntil, setExamUntil] = useState(initialExamModeUntil ?? "");
  const [role, setRole] = useState<RoleChoice>(choiceFromRoles(initialRoles));

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = touched && displayName.trim().length < 2;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);
    setSaved(false);
    if (displayName.trim().length < 2) return;

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setFormError("Session expired. Sign in again.");
      return;
    }

    // `admin` is never self-assignable — rolesFromChoice() only ever produces
    // player/handler, so re-append admin here rather than let a settings save
    // silently drop it from an admin's account.
    const roles = initialRoles.includes("admin")
      ? [...rolesFromChoice(role), "admin"]
      : rolesFromChoice(role);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        region: region.trim() || null,
        exam_mode: examMode,
        exam_mode_until: examMode && examUntil ? examUntil : null,
        roles,
      })
      .eq("id", user.id);

    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <>
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}
      {saved && (
        <div className={styles.formOk} role="status">
          Saved.
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="set-name">
            Display name
          </label>
          <input
            id="set-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={nameError}
            aria-describedby={nameError ? "set-name-err" : undefined}
            disabled={submitting}
            required
          />
          {nameError && (
            <span id="set-name-err" className={styles.fieldError}>
              At least 2 characters.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="set-region">
            Region
          </label>
          <input
            id="set-region"
            className={styles.input}
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. NCR"
            disabled={submitting}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Role</h2>

        <div className={styles.field}>
          <div className={styles.roleGroup} role="radiogroup" aria-label="Role">
            {ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.roleCard}>
                <input
                  type="radio"
                  name="set-role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  disabled={submitting}
                />
                <span className={styles.roleText}>
                  <span className={styles.roleName}>{opt.name}</span>
                  <span className={styles.roleDesc}>{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <span className={styles.hint}>
            Switching to Team Handler (or Both) unlocks creating and running a
            team.
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Exam-week status</h2>

        <div className={styles.switchRow}>
          <button
            type="button"
            role="switch"
            aria-checked={examMode}
            className={styles.switch}
            onClick={() => setExamMode((v) => !v)}
            disabled={submitting}
            aria-label="Exam-week status"
          />
          <span className={styles.switchText}>
            <span className={styles.switchName}>
              {examMode ? "On — listings paused" : "Off"}
            </span>
            <span className={styles.switchDesc}>
              Pauses your team&apos;s scrim listings. No reliability penalty.
            </span>
          </span>
        </div>

        {examMode && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="set-exam-until">
              Until (optional)
            </label>
            <input
              id="set-exam-until"
              className={styles.input}
              type="date"
              value={examUntil}
              onChange={(e) => setExamUntil(e.target.value)}
              disabled={submitting}
            />
            <span className={styles.hint}>
              Leave blank to keep it on until you turn it off.
            </span>
          </div>
        )}
      </section>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          data-loading={submitting}
          disabled={submitting}
        >
          Save changes
        </button>
      </div>
    </form>

    <form action="/auth/sign-out" method="post" className={styles.actions}>
      <button type="submit" className={styles.signOut}>
        Sign out
      </button>
    </form>
    </>
  );
}
