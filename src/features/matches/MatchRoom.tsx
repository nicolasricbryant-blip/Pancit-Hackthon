import Link from "next/link";
import { ROUTES } from "@/config/nav";
import { getGame } from "@/features/games/config";
import styles from "./matches.module.css";
import { StatusPill } from "./StatusPill";
import { Countdown } from "./Countdown";
import { RulesetPanel } from "./RulesetPanel";
import { ResultPanel } from "./ResultPanel";
import { absoluteTime, relativeTime } from "./types";
import type { MatchRoomData } from "./queries";

export interface MatchRoomLikeProps {
  data: MatchRoomData;
}

/** Opponent-contact stub — no real messaging this milestone. */
function ContactPanel({
  handlerHandle,
  opponentName,
}: {
  handlerHandle: string | null;
  opponentName: string;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Opponent contact</h2>
      </div>
      <div className={styles.contact}>
        <p>Coordinate in TAMBAYAN chat (coming soon).</p>
        {handlerHandle ? (
          <p>
            {opponentName} handler:{" "}
            <span className={styles.contactHandle}>@{handlerHandle}</span>
          </p>
        ) : (
          <p className={styles.readOnlyNote}>
            {opponentName} has no handler linked yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function MatchRoom({ data }: MatchRoomLikeProps) {
  const { view, viewerSide } = data;
  const { match, teamA, teamB } = view;
  const game = getGame(view.game);

  const winnerIsA = match.winner === teamA.id;
  const winnerIsB = match.winner === teamB.id;

  // "Opponent" for the contact card = the side the viewer does NOT handle.
  const opp = viewerSide === "a" ? teamB : teamA;

  return (
    <div className={styles.wrap}>
      <header className={styles.roomHead}>
        <Link href={ROUTES.matches} className={styles.backLink}>
          ← Match Room
        </Link>

        <div className={styles.matchup}>
          <div className={styles.side}>
            <span className={styles.sideName}>
              {teamA.name}
              {winnerIsA && <span className={styles.winMark} aria-label="winner">✓</span>}
            </span>
            <span className={styles.sideSub}>
              {[teamA.tag ? `[${teamA.tag}]` : null, teamA.schoolName]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </div>

          <span className={styles.vs}>vs</span>

          <div className={styles.side}>
            <span className={styles.sideName}>
              {teamB.name}
              {winnerIsB && <span className={styles.winMark} aria-label="winner">✓</span>}
            </span>
            <span className={styles.sideSub}>
              {[teamB.tag ? `[${teamB.tag}]` : null, teamB.schoolName]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </div>
        </div>

        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeHue}`}>{game.label}</span>
          <span className={styles.badge}>{match.format}</span>
          <StatusPill status={match.status} />
          <span className={styles.badge}>
            {relativeTime(match.scheduled_at)} · {absoluteTime(match.scheduled_at)}
          </span>
        </div>
      </header>

      <Countdown scheduledAt={match.scheduled_at} format={match.format} />

      <RulesetPanel view={view} viewerSide={viewerSide} />

      <ContactPanel handlerHandle={opp.handlerHandle} opponentName={opp.name} />

      <ResultPanel view={view} viewerSide={viewerSide} />

      {viewerSide === null && (
        <p className={styles.readOnlyNote}>
          You&apos;re viewing this match room read-only. Actions are limited to a
          handler of {teamA.name} or {teamB.name}.
        </p>
      )}
    </div>
  );
}
