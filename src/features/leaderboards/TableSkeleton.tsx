import type { BoardKind } from "./types";
import styles from "./leaderboards.module.css";

/** Loading placeholder — shimmer rows in the table shell while a board fetches. */
export function TableSkeleton({ board }: { board: BoardKind }) {
  const cols = board === "player" ? 6 : 8;
  return (
    <div className={styles.scroll} aria-hidden>
      <table className={styles.table}>
        <tbody>
          {Array.from({ length: 8 }).map((_, r) => (
            <tr key={r} className={styles.row}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <span className={`${styles.sk} shimmer`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
