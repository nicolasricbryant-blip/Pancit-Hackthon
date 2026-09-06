import styles from "./leaderboards.module.css";

/** Shared empty / not-yet-populated panel for both boards. */
export function Empty({ message }: { message: string }) {
  return (
    <div className={styles.empty}>
      <p>{message}</p>
    </div>
  );
}
