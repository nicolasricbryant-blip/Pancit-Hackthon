"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "./types";
import styles from "./mentorship.module.css";

interface Props {
  action: (formData: FormData) => Promise<ActionResult>;
  id: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "ghost";
}

/**
 * One button that fires a bound mentorship server action for a given request id
 * and surfaces `{ ok: false, error }` inline. The action calls `revalidatePath`,
 * so a success just re-renders the page with the new state.
 */
export function RequestActionButton({
  action,
  id,
  label,
  pendingLabel,
  variant = "ghost",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className={styles.actionWrap}>
      <button
        type="button"
        className={variant === "primary" ? styles.btnPrimary : styles.btnGhost}
        data-loading={pending}
        disabled={pending}
        onClick={() => {
          setError(null);
          const formData = new FormData();
          formData.set("id", id);
          startTransition(async () => {
            const res = await action(formData);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && (
        <span className={styles.actionError} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
