"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RsvpStatus } from "./types";
import styles from "./events.module.css";

interface Props {
  eventId: string;
  initialStatus: RsvpStatus | null;
  isAuthed: boolean;
}

type Pending = "going" | "interested" | "cancel" | null;

/**
 * RSVP buttons. Anonymous viewers get a sign-in link. Authed viewers upsert
 * `event_rsvps` (onConflict event_id,profile_id) and the row refreshes.
 */
export function RsvpControls({ eventId, initialStatus, isAuthed }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthed) {
    return (
      <p className={styles.signInNote}>
        <a href={`/sign-in?next=${encodeURIComponent(`/events/${eventId}`)}`}>
          Sign in to RSVP
        </a>
      </p>
    );
  }

  async function setRsvp(next: RsvpStatus, key: Pending) {
    setPending(key);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(null);
      setError("Session expired. Sign in again.");
      return;
    }

    const { error: upsertError } = await supabase
      .from("event_rsvps")
      .upsert(
        { event_id: eventId, profile_id: user.id, status: next },
        { onConflict: "event_id,profile_id" },
      );

    setPending(null);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setStatus(next === "cancelled" ? null : next);
    router.refresh();
  }

  return (
    <div className={styles.rsvp}>
      <div className={styles.rsvpBtns}>
        <button
          type="button"
          className={styles.rsvpBtn}
          aria-pressed={status === "going"}
          data-loading={pending === "going"}
          disabled={pending !== null}
          onClick={() => setRsvp("going", "going")}
        >
          Going
        </button>
        <button
          type="button"
          className={styles.rsvpBtn}
          aria-pressed={status === "interested"}
          data-loading={pending === "interested"}
          disabled={pending !== null}
          onClick={() => setRsvp("interested", "interested")}
        >
          Interested
        </button>
        <button
          type="button"
          className={styles.rsvpBtn}
          data-loading={pending === "cancel"}
          disabled={pending !== null || status === null}
          onClick={() => setRsvp("cancelled", "cancel")}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className={styles.rsvpError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
