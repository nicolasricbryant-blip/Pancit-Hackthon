"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { approveSubmission, rejectSubmission } from "./actions";
import styles from "./ReviewCard.module.css";

export interface ReviewItem {
  submissionId: string;
  submitter: string;
  handle: string | null;
  school: string | null;
  gameLabel: string;
  createdAtISO: string;
  chips: [string, string][];
  screenshotUrl: string | null;
}

type Phase = "idle" | "approving" | "rejecting" | "done" | "error";

const DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function ReviewCard({ item }: { item: ReviewItem }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"approved" | "rejected" | null>(null);

  const busy = phase === "approving" || phase === "rejecting";
  const submittedAt = useMemo(() => {
    const d = new Date(item.createdAtISO);
    return Number.isNaN(d.getTime()) ? item.createdAtISO : DATE_FMT.format(d);
  }, [item.createdAtISO]);

  async function onApprove() {
    setError(null);
    setPhase("approving");
    const res = await approveSubmission(item.submissionId);
    if (res?.error) {
      setPhase("error");
      setError(res.error);
      return;
    }
    setOutcome("approved");
    setPhase("done");
    router.refresh();
  }

  async function onReject() {
    if (!reason.trim()) return;
    setError(null);
    setPhase("rejecting");
    const res = await rejectSubmission(item.submissionId, reason);
    if (res?.error) {
      setPhase("error");
      setError(res.error);
      return;
    }
    setOutcome("rejected");
    setPhase("done");
    router.refresh();
  }

  if (phase === "done" && outcome) {
    return (
      <article className={styles.card} data-resolved={outcome}>
        <p className={styles.resolvedNote} role="status">
          {outcome === "approved" ? "Approved" : "Rejected"} — {item.submitter}
        </p>
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.who}>
          <span className={styles.name}>{item.submitter}</span>
          <span className={styles.meta}>
            {item.handle ? `@${item.handle}` : "no handle"}
            {item.school ? ` · ${item.school}` : ""}
          </span>
        </div>
        <div className={styles.headRight}>
          <span className={styles.game}>{item.gameLabel}</span>
          <time className={styles.time} dateTime={item.createdAtISO}>
            {submittedAt}
          </time>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.claim}>
          <span className={styles.claimLabel}>Claimed</span>
          {item.chips.length > 0 ? (
            <ul className={styles.chips}>
              {item.chips.map(([k, v]) => (
                <li className={styles.chip} key={k}>
                  <span className={styles.chipKey}>{k}</span>
                  <span className={styles.chipValue}>{v}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className={styles.claimEmpty}>No structured values</span>
          )}
        </div>

        <div className={styles.proof}>
          <span className={styles.claimLabel}>Proof</span>
          {item.screenshotUrl ? (
            <a
              className={styles.proofLink}
              href={item.screenshotUrl}
              target="_blank"
              rel="noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.shot}
                src={item.screenshotUrl}
                alt={`Rank proof from ${item.submitter}`}
                loading="lazy"
              />
            </a>
          ) : (
            <span className={styles.claimEmpty}>Screenshot unavailable</span>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {rejecting && (
        <div className={styles.rejectBox}>
          <label className={styles.rejectLabel} htmlFor={`rej-${item.submissionId}`}>
            Reason (shown to the player, required)
          </label>
          <textarea
            id={`rej-${item.submissionId}`}
            className={styles.textarea}
            rows={3}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Screenshot doesn't show the rank screen / name mismatch."
          />
        </div>
      )}

      <footer className={styles.actions}>
        {!rejecting ? (
          <>
            <button
              type="button"
              className={styles.approve}
              onClick={onApprove}
              disabled={busy}
              aria-busy={phase === "approving"}
              data-loading={phase === "approving"}
              data-error={phase === "error"}
            >
              {phase === "approving" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              className={styles.reject}
              onClick={() => {
                setError(null);
                setRejecting(true);
              }}
              disabled={busy}
            >
              Reject…
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.reject}
              onClick={onReject}
              disabled={busy || !reason.trim()}
              aria-busy={phase === "rejecting"}
              data-loading={phase === "rejecting"}
              data-error={phase === "error"}
            >
              {phase === "rejecting" ? "Rejecting…" : "Confirm reject"}
            </button>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
                if (phase === "error") setPhase("idle");
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
