import { BRACKET_STATUS_LABEL, roundLabel, type BracketNode } from "./types";
import styles from "./brackets.module.css";

/**
 * The bracket tree: one column per round (round 1 leftmost), each a vertical
 * stack of match nodes ordered by slot. Scrolls horizontally inside its own
 * container so the page body never scrolls sideways.
 */
export function BracketTree({
  nodes,
  rounds,
  championName,
}: {
  nodes: BracketNode[];
  rounds: number;
  championName: string | null;
}) {
  if (nodes.length === 0) {
    return <p className={styles.readOnlyNote}>Bracket not generated yet.</p>;
  }

  const byRound = new Map<number, BracketNode[]>();
  for (const n of nodes) {
    const arr = byRound.get(n.round) ?? [];
    arr.push(n);
    byRound.set(n.round, arr);
  }
  const roundNums = [...byRound.keys()].sort((a, b) => a - b);

  return (
    <div className={styles.bracketScroll}>
      <div className={styles.bracketCols}>
        {roundNums.map((r) => {
          const col = [...(byRound.get(r) ?? [])].sort((a, b) => a.slot - b.slot);
          return (
            <div key={r} className={styles.round}>
              <div className={styles.roundLabel}>{roundLabel(r, rounds)}</div>
              {col.map((n) => (
                <NodeCard key={n.id} n={n} />
              ))}
            </div>
          );
        })}

        {championName && (
          <div className={styles.round}>
            <div className={styles.roundLabel}>Champion</div>
            <div className={styles.championCard}>
              <span className={styles.championMark} aria-hidden>
                ★
              </span>
              <span className={styles.championName}>{championName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeCard({ n }: { n: BracketNode }) {
  const winA = n.winner != null && n.teamA?.id === n.winner;
  const winB = n.winner != null && n.teamB?.id === n.winner;

  return (
    <div className={styles.node}>
      <div className={styles.nodeRow} data-winner={winA ? "true" : undefined}>
        <span className={styles.nodeTeam}>{n.teamA ? n.teamA.name : "TBD"}</span>
        <span className={styles.nodeScore}>{n.scoreA ?? "–"}</span>
      </div>
      <div className={styles.nodeRow} data-winner={winB ? "true" : undefined}>
        <span className={styles.nodeTeam}>{n.teamB ? n.teamB.name : "TBD"}</span>
        <span className={styles.nodeScore}>{n.scoreB ?? "–"}</span>
      </div>
      <div className={styles.nodeFoot}>
        <span className={styles.nodePill} data-status={n.status}>
          {BRACKET_STATUS_LABEL[n.status] ?? n.status}
        </span>
      </div>
    </div>
  );
}
