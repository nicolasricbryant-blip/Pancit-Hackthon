"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestScrim } from "./actions";
import type { RequestState } from "./types";

type Phase = "idle" | "composing" | "loading" | "success" | "error";

interface Props {
  listingId: string;
  teamName: string;
  /** Computed server-side (listScrimsForGame) — never re-derived on the client. */
  requestState: RequestState;
}

/**
 * Drives the real requestScrim() server action off `requestState`. Every
 * non-actionable state gets its own honest, disabled/linking copy instead of
 * a live-looking control — there is no client-side eligibility check to fall
 * back on; the server already decided.
 */
export function RequestScrimButton({ listingId, teamName, requestState }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (requestState === "anon") {
    return (
      <Link href="/sign-in" className="request-btn">
        Sign in to request
      </Link>
    );
  }

  if (requestState === "no-team") {
    return (
      <button type="button" className="request-btn" disabled>
        Create a team to request
      </button>
    );
  }

  if (requestState === "own-team") {
    return (
      <button type="button" className="request-btn" disabled>
        Your listing
      </button>
    );
  }

  if (requestState === "requested" || phase === "success") {
    return (
      <button type="button" className="request-btn is-success" disabled>
        Requested
      </button>
    );
  }

  async function onSend() {
    if (phase === "loading") return;
    setPhase("loading");
    setError(null);
    const res = await requestScrim({ listingId, message });
    if (!res.ok) {
      setPhase("error");
      setError(res.error);
      return;
    }
    setPhase("success");
    router.refresh();
  }

  if (phase === "composing" || phase === "loading" || phase === "error") {
    return (
      <div className="request-compose">
        <textarea
          className="request-compose-input"
          rows={2}
          placeholder={`Message ${teamName} (optional)`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={phase === "loading"}
          maxLength={280}
        />
        {phase === "error" && error && (
          <span className="request-error" role="alert">
            {error}
          </span>
        )}
        <div className="request-compose-actions">
          <button
            type="button"
            className={`request-btn${phase === "loading" ? " is-loading" : ""}`}
            disabled={phase === "loading"}
            aria-busy={phase === "loading"}
            onClick={onSend}
          >
            {phase === "loading" ? "Sending…" : "Send request"}
          </button>
          <button
            type="button"
            className="chip-clear"
            disabled={phase === "loading"}
            onClick={() => {
              setPhase("idle");
              setMessage("");
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // phase === "idle", requestState === "can-request"
  return (
    <button
      type="button"
      className="request-btn"
      aria-label={`Request scrim with ${teamName}`}
      onClick={() => setPhase("composing")}
    >
      Request Scrim
    </button>
  );
}
