"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerTeam, withdrawTeam } from "./actions";
import type { ActionResult } from "./types";
import styles from "./brackets.module.css";

interface Props {
  slug: string;
  /** Teams the viewer handles in this game that aren't registered yet. */
  eligible: { id: string; name: string }[];
  /** Teams the viewer handles that are already registered. */
  mine: { id: string; name: string }[];
}

/** Register / withdraw controls shown on the tournament page during registration. */
export function EntrantActions({ slug, eligible, mine }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<ActionResult>) {
    setBusy(key);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (eligible.length === 0 && mine.length === 0) return null;

  return (
    <div className={styles.entrantActions}>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.entrantActionRow}>
        {eligible.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.btn}
            data-loading={busy === `r-${t.id}`}
            disabled={busy != null}
            onClick={() => run(`r-${t.id}`, () => registerTeam(slug, t.id))}
          >
            Register {t.name}
          </button>
        ))}
        {mine.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            data-loading={busy === `w-${t.id}`}
            disabled={busy != null}
            onClick={() => run(`w-${t.id}`, () => withdrawTeam(slug, t.id))}
          >
            Withdraw {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
