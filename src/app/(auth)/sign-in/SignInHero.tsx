"use client";

import { useState } from "react";
import Link from "next/link";
import { SignInForm } from "./SignInForm";
import authStyles from "../auth.module.css";
import styles from "./signInHero.module.css";

/**
 * Landing screen for `/sign-in`: brand hero + "Sign in" / "Create an Account"
 * choice, matching the designer's mockup. "Sign in" reveals the existing
 * `SignInForm` in place (same card styling `/sign-up` uses) rather than
 * navigating away, so the `next` redirect param survives untouched.
 *
 * The hero art is a navy gradient, not the designer's character
 * illustration — that looked like game key art / fan art rather than an
 * original or licensed asset, so it isn't safe to ship. Swap `.heroArt`'s
 * background in signInHero.module.css for the real thing once you have
 * rights to it. The Google/Facebook/Steam buttons are visual-only per
 * plan — wiring real OAuth needs each provider registered in the Supabase
 * dashboard first (client ID/secret), which is a setup step, not code.
 */
export function SignInHero({ next }: { next: string }) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className={authStyles.card}>
        <button
          type="button"
          className={styles.back}
          onClick={() => setShowForm(false)}
        >
          ← Back
        </button>
        <div className={authStyles.head}>
          <h1 className={authStyles.title}>Sign in</h1>
          <p className={authStyles.sub}>Welcome back to TAMBAYAN.</p>
        </div>

        <SignInForm next={next} />

        <p className={authStyles.altRow}>
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.hero}>
      <div className={styles.heroArt}>
        <div className={styles.heroArtHead}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark-dark-theme.png"
            alt=""
            className={styles.heroArtIcon}
          />
          <span className={styles.heroArtWord}>TAMBAYAN</span>
        </div>
      </div>

      <div className={styles.heroBody}>
        <h1 className={styles.heroTitle}>
          Same Game.
          <br />
          More People.
        </h1>
        <p className={styles.heroSub}>
          Find Teammates. Host Competitions. Climb Leaderboards.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.signInBtn}
            onClick={() => setShowForm(true)}
          >
            Sign in
          </button>
          <Link href="/sign-up" className={styles.createBtn}>
            Create an Account
          </Link>
        </div>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <div className={styles.socialRow}>
          <button
            type="button"
            className={styles.socialBtn}
            disabled
            aria-label="Continue with Google — coming soon"
            title="Coming soon"
          >
            <GoogleIcon />
          </button>
          <button
            type="button"
            className={styles.socialBtn}
            disabled
            aria-label="Continue with Facebook — coming soon"
            title="Coming soon"
          >
            <FacebookIcon />
          </button>
          <button
            type="button"
            className={styles.socialBtn}
            disabled
            aria-label="Continue with Steam — coming soon"
            title="Coming soon"
          >
            <SteamIcon />
          </button>
        </div>
      </div>

      <p className={styles.footer}>PANCIT HACKATHON</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.04 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.18a5.28 5.28 0 0 1-2.29 3.47v2.88h3.7c2.17-2 3.42-4.93 3.42-8.38Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1.02 7.6-2.77l-3.7-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.72v2.97A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.71a7.2 7.2 0 0 1 0-4.62V7.12H1.72a12 12 0 0 0 0 9.76l3.83-2.97Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.68 0 3.19.58 4.38 1.71l3.29-3.29C17.7 1.19 15.1 0 12 0A12 12 0 0 0 1.72 7.12l3.83 2.97C6.46 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.5 15.5 17 12h-3.5v-2.3c0-1 .3-1.7 1.8-1.7h1.9V4.7c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8V12H6.9v3.5h3.1V23h3.5v-7.5h2.9Z"
      />
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#171a21" />
      <path
        fill="#66c0f4"
        d="M6 15.9 9.6 14a2.7 2.7 0 0 1 2.6-2 2.7 2.7 0 1 1-.2 3.9l-3.6 1.6a1.9 1.9 0 1 1-2.4-1.6Z"
      />
      <circle cx="15" cy="8.6" r="2.4" fill="#66c0f4" />
    </svg>
  );
}
