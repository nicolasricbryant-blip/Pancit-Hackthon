import type { VerificationStatus } from "./form";
import styles from "./RankStatusBadge.module.css";

/** Pure status pill. Safe in Server Components. */

const COPY: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 7.9l1.6 1.6 3-3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RankStatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {status === "verified" && <ShieldIcon />}
      {COPY[status]}
    </span>
  );
}
