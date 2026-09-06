import styles from "./matches.module.css";
import { STATUS_LABEL } from "./types";

const VARIANT: Record<string, string> = {
  booked: styles.pillBooked,
  reported: styles.pillReported,
  confirmed: styles.pillConfirmed,
  disputed: styles.pillDisputed,
  cancelled: styles.pillCancelled,
};

/** Status pill — shared by the list rows and the Match Room header. */
export function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={`${styles.pill} ${VARIANT[status] ?? ""}`.trim()}>{label}</span>
  );
}
