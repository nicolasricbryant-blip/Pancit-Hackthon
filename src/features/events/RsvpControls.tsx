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
  /** Current confirmed "going" count and the event's capacity, if capped. */
  goingCount: number;
  capacity: number | null;
}

type Pending = "going" | "interested" | "cancel" | null;

/**
 * RSVP buttons. Anonymous viewers get a sign-in link. Authed viewers upsert
 * `event_rsvps` (onConflict event_id,profile_id) and the row refreshes.
 *
 * Capacity is enforced by a DB trigger (see the event_capacity migration) —
 * the anon key is public, so this component's own capacity check is a UX
 * nicety, not the boundary. It still disables "Going" once full (only for a
 * viewer who isn't already going — a going->going re-upsert is always a
 * no-op the trigger allows) and turns the trigger's rejection into plain
 * copy instead of a raw Postgres error, in case the count changes between
 * render and click.
 */
export function RsvpControls({
  eventId,
  initialStatus,
  isAuthed,
  goingCount,
  capacity,
}: Props) {
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

  const isFull = capacity != null && goingCount >= capacity;
  const goingDisabled = pending !== null || (isFull && status !== "going");

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
      // The event_rsvps capacity trigger raises this exact message — see
      // enforce_event_rsvp_capacity() in the event_capacity migration.
      setError(
        upsertError.message === "event is at capacity"
          ? "This event is full."
          : upsertError.message,
      );
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
          disabled={goingDisabled}
          title={isFull && status !== "going" ? "This event is full." : undefined}
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
      {isFull && status !== "going" && !error && (
        <p className={styles.signInNote}>This event is full.</p>
      )}
      {error && (
        <p className={styles.rsvpError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
