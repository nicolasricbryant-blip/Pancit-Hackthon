"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailInvalid =
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passInvalid = touched && password.length === 0;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);
    if (emailInvalid || password.length === 0) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSubmitting(false);
      setFormError(
        error.message === "Invalid login credentials"
          ? "Wrong email or password."
          : error.message,
      );
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="si-email">
          Email
        </label>
        <input
          id="si-email"
          className={styles.input}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailInvalid}
          aria-describedby={emailInvalid ? "si-email-err" : undefined}
          disabled={submitting}
          required
        />
        {emailInvalid && (
          <span id="si-email-err" className={styles.fieldError}>
            Enter a valid email.
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="si-pass">
          Password
        </label>
        <input
          id="si-pass"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={passInvalid}
          aria-describedby={passInvalid ? "si-pass-err" : undefined}
          disabled={submitting}
          required
        />
        {passInvalid && (
          <span id="si-pass-err" className={styles.fieldError}>
            Enter your password.
          </span>
        )}
      </div>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Sign in
      </button>
    </form>
  );
}
