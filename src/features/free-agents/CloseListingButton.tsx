"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closePost } from "./actions";
import styles from "./free-agents.module.css";

/** Owner-only control: flips a listing to `closed`, then refreshes the board. */
export function CloseListingButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClose() {
    setError(null);
    startTransition(async () => {
      const res = await closePost(postId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        disabled={pending}
        data-loading={pending}
      >
        {pending ? "Closing…" : "Close"}
      </button>
      {error && (
        <span className={styles.closeErr} role="alert">
          {" "}
          {error}
        </span>
      )}
    </span>
  );
}
