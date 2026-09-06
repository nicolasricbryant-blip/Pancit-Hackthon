"use client";

import { useSyncExternalStore } from "react";
import styles from "./events.module.css";

/**
 * Calm, non-judgmental exam-week notice. Rendered only when the caller has
 * confirmed `profile.exam_mode`. Dismissal is per-session (sessionStorage) and
 * returns on the next visit. Read-only: never mutates exam_mode.
 */
const KEY = "tambayan.events.examBannerDismissed";
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function dismiss(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable — fall through, still notify for this session */
  }
  for (const l of listeners) l();
}

export function ExamBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (dismissed) return null;

  return (
    <div className={styles.examBanner} role="note">
      <span className={styles.examText}>
        Exam-week mode is on — your scrim listings are paused. Events are here
        whenever you want a break.
      </span>
      <button
        type="button"
        className={styles.examDismiss}
        aria-label="Dismiss exam-week notice"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
