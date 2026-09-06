import styles from "./matches.module.css";

/** Shared shimmer line — reuses the global `.shimmer` keyframes from globals.css. */
function Line({ w }: { w?: string }) {
  return (
    <span
      className="shimmer sk-line"
      style={{ width: w ?? "100%", display: "block" }}
      aria-hidden
    />
  );
}

export function MatchListSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <div className={styles.head}>
        <Line w="40%" />
        <Line w="70%" />
      </div>
      <div className={styles.list}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <Line w="55%" />
            <Line w="80%" />
            <Line w="30%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchRoomSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true">
      <div className={styles.roomHead}>
        <Line w="30%" />
        <Line w="80%" />
        <Line w="50%" />
      </div>
      <div className={styles.countdown}>
        <Line w="40%" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.panel}>
          <Line w="35%" />
          <Line w="90%" />
          <Line w="60%" />
        </div>
      ))}
    </div>
  );
}
