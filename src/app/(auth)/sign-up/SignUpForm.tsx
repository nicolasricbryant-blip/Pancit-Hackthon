"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RoleChoice } from "@/features/auth/types";
import styles from "../auth.module.css";

type Status = "idle" | "submitting" | "confirm";

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

const ROLE_OPTIONS: { value: RoleChoice; name: string; desc: string }[] = [
  {
    value: "player",
    name: "Player",
    desc: "Game profiles + ranks, join a team, browse and request scrims.",
  },
  {
    value: "handler",
    name: "Team Handler",
    desc: "Create a team, post availability, accept requests, report results.",
  },
  {
    value: "both",
    name: "Both — player-captain",
    desc: "The common collegiate case. Play and run your own roster.",
  },
];

function validate(
  displayName: string,
  email: string,
  password: string,
  confirm: string,
): FieldErrors {
  const e: FieldErrors = {};
  if (displayName.trim().length < 2) e.displayName = "At least 2 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
  if (password.length < 8) e.password = "At least 8 characters.";
  if (confirm !== password) e.confirm = "Passwords don't match.";
  return e;
}

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<RoleChoice>("both");

  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const schoolEmail = useMemo(
    () => /@[^\s@]+\.edu\.ph$/i.test(email.trim()),
    [email],
  );

  const submitting = status === "submitting";

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);

    const v = validate(displayName, email, password, confirm);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setStatus("submitting");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });

    if (error) {
      setStatus("idle");
      setFormError(error.message);
      return;
    }

    // No session back → email confirmation is on. Show the check-your-email state.
    if (!data.session) {
      setStatus("confirm");
      return;
    }

    // Session live → straight to onboarding, carrying the role choice.
    router.replace(`/onboarding?role=${role}`);
    router.refresh();
  }

  if (status === "confirm") {
    return (
      <div className={styles.notice}>
        <span className={styles.noticeIcon} aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16v12H4z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="m4 7 8 6 8-6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className={styles.title} style={{ fontSize: "var(--text-lg)" }}>
          Check your email
        </h2>
        <p className={styles.sub}>
          We sent a confirmation link to <strong>{email.trim()}</strong>. Open it
          to activate your account, then sign in.
        </p>
        <a className={styles.altRow} href="/sign-in">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="su-name">
          Display name
        </label>
        <input
          id="su-name"
          className={styles.input}
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={touched && !!errors.displayName}
          aria-describedby={errors.displayName ? "su-name-err" : undefined}
          disabled={submitting}
          required
        />
        {touched && errors.displayName && (
          <span id="su-name-err" className={styles.fieldError}>
            {errors.displayName}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="su-email">
          Email
        </label>
        <input
          id="su-email"
          className={styles.input}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={touched && !!errors.email}
          aria-describedby="su-email-hint"
          disabled={submitting}
          required
        />
        {touched && errors.email ? (
          <span id="su-email-hint" className={styles.fieldError}>
            {errors.email}
          </span>
        ) : (
          <span
            id="su-email-hint"
            className={`${styles.hint} ${
              email.trim() ? (schoolEmail ? styles.ok : styles.warn) : ""
            }`}
          >
            {email.trim() === ""
              ? "Use your school email (.edu.ph) for automatic collegiate verification."
              : schoolEmail
                ? "School email detected — collegiate status will be auto-verified."
                : "Not a .edu.ph address — you'll need manual COR review later."}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="su-pass">
          Password
        </label>
        <input
          id="su-pass"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={touched && !!errors.password}
          aria-describedby={errors.password ? "su-pass-err" : undefined}
          disabled={submitting}
          required
        />
        {touched && errors.password && (
          <span id="su-pass-err" className={styles.fieldError}>
            {errors.password}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="su-confirm">
          Confirm password
        </label>
        <input
          id="su-confirm"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={touched && !!errors.confirm}
          aria-describedby={errors.confirm ? "su-confirm-err" : undefined}
          disabled={submitting}
          required
        />
        {touched && errors.confirm && (
          <span id="su-confirm-err" className={styles.fieldError}>
            {errors.confirm}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>I&apos;m signing up as</span>
        <div
          className={styles.roleGroup}
          role="radiogroup"
          aria-label="Account role"
        >
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className={styles.roleCard}>
              <input
                type="radio"
                name="role"
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
      </div>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Create account
      </button>
    </form>
  );
}
