"use client";

import { useSyncExternalStore } from "react";
import styles from "./matches.module.css";
import { estimatedDurationMs } from "./types";

interface Props {
  scheduledAt: string | null;
  format: string;
}

type Phase = "pre" | "live" | "ended";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function readout(msUntil: number): string {
  const s = Math.max(0, Math.floor(msUntil / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Ticking "now" as an external store — no setState-in-effect, no hydration flash. */
function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const noopSubscribe = () => () => {};

function useNow(active: boolean): number | null {
  return useSyncExternalStore(
    active ? subscribe : noopSubscribe,
    () => Date.now(),
    () => null,
  );
}

/**
 * Countdown to a match. Updates once per second as plain text — no keyframe
 * animation — so it stays calm under prefers-reduced-motion. On the server (and
 * first hydration paint) `now` is null and a stable placeholder renders.
 */
export function Countdown({ scheduledAt, format }: Props) {
  const now = useNow(scheduledAt != null);

  if (!scheduledAt) {
    return (
      <div className={styles.countdown}>
        <span className={`${styles.countValue} ${styles.countEnded}`}>Not scheduled</span>
        <span className={styles.countLabel}>Kickoff</span>
      </div>
    );
  }

  const start = new Date(scheduledAt).getTime();
  const end = start + estimatedDurationMs(format);

  let phase: Phase = "pre";
  let value = "—:—:—";
  let label = "Starts in";

  if (now != null) {
    if (now < start) {
      phase = "pre";
      value = readout(start - now);
      label = "Starts in";
    } else if (now < end) {
      phase = "live";
      value = "LIVE";
      label = "In progress";
    } else {
      phase = "ended";
      value = "Ended";
      label = "Scheduled window has passed";
    }
  }

  const cls =
    phase === "live"
      ? `${styles.countValue} ${styles.countLive}`
      : phase === "ended"
        ? `${styles.countValue} ${styles.countEnded}`
        : styles.countValue;

  return (
    <div className={styles.countdown}>
      <span className={cls} role="timer" aria-live="off">
        {value}
      </span>
      <span className={styles.countLabel}>{label}</span>
    </div>
  );
}
