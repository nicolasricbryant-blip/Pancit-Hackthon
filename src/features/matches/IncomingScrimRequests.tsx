"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./matches.module.css";
import { relativeTime } from "./types";
import {
  acceptScrimRequest,
  declineScrimRequest,
} from "@/features/scrims/actions";
import type { IncomingScrimRequest } from "@/features/scrims/types";

/** One incoming request, with its own Accept/Decline lifecycle. */
function RequestCard({ request }: { request: IncomingScrimRequest }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "accept" | "decline">(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    if (busy) return;
    setBusy(action);
    setError(null);
    const res =
      action === "accept"
        ? await acceptScrimRequest(request.id)
        : await declineScrimRequest(request.id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.rowOpp}>{request.fromTeamName}</span>
        {request.fromTeamTag && (
          <span className={styles.rowTag}>[{request.fromTeamTag}]</span>
        )}
      </div>

      <div className={styles.rowMeta}>
        {request.fromSchool && (
          <>
            <span>{request.fromSchool}</span>
            <span className={styles.sep}>·</span>
          </>
        )}
        <span className={styles.mono}>{request.format}</span>
        {request.windowLabel && (
          <>
            <span className={styles.sep}>·</span>
            <span>{request.windowLabel}</span>
          </>
        )}
        <span className={styles.sep}>·</span>
        <span className={styles.mono}>{relativeTime(request.createdAt)}</span>
      </div>

      {request.message && (
        <p className={styles.resultState}>&ldquo;{request.message}&rdquo;</p>
      )}

      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btn}
          data-loading={busy === "accept"}
          disabled={busy != null}
          onClick={() => respond("accept")}
        >
          Accept
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          data-loading={busy === "decline"}
          disabled={busy != null}
          onClick={() => respond("decline")}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

/**
 * Requests other handlers have sent to any team the viewer handles. Renders
 * nothing when there are none — most visits to /matches won't have a pending
 * request waiting, and an empty "Incoming requests" panel every time would
 * just be noise above the match list.
 */
export function IncomingScrimRequests({
  requests,
}: {
  requests: IncomingScrimRequest[];
}) {
  if (requests.length === 0) return null;

  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h2 className={styles.groupTitle}>Incoming scrim requests</h2>
        <span className={styles.groupCount}>{requests.length}</span>
      </div>
      <div className={styles.list}>
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </div>
    </section>
  );
}
