import Link from "next/link";
import { ROUTES } from "@/config/nav";
import styles from "./matches.module.css";
import { StatusPill } from "./StatusPill";
import {
  GROUP_LABEL,
  absoluteTime,
  relativeTime,
  type MatchGroupKey,
  type MatchGroups,
  type MatchView,
} from "./types";

/** One match as a tappable row. `myTeamIds` picks which side is "the opponent". */
function MatchRow({ view, myTeamIds }: { view: MatchView; myTeamIds: Set<string> }) {
  const { match, teamA, teamB } = view;
  const onATeam = myTeamIds.size > 0;
  const iAmA = myTeamIds.has(teamA.id);
  const opp = iAmA ? teamB : teamA;
  const mine = iAmA ? teamA : teamB;

  return (
    <Link href={`${ROUTES.matches}/${match.id}`} className={styles.row}>
      <div className={styles.rowTop}>
        <span className={styles.rowOpp}>
          {onATeam ? opp.name : `${teamA.name} vs ${teamB.name}`}
        </span>
        {onATeam && opp.tag && <span className={styles.rowTag}>[{opp.tag}]</span>}
        <span className={styles.hueDot} aria-hidden />
      </div>
      <div className={styles.rowMeta}>
        {onATeam && (
          <>
            <span>as {mine.tag ? `[${mine.tag}]` : mine.name}</span>
            <span className={styles.sep}>·</span>
          </>
        )}
        <span className={styles.mono}>{relativeTime(match.scheduled_at)}</span>
        <span className={styles.sep}>·</span>
        <span>{absoluteTime(match.scheduled_at)}</span>
        <span className={styles.sep}>·</span>
        <span className={styles.mono}>{match.format}</span>
      </div>
      <div className={styles.rowMeta}>
        <StatusPill status={match.status} />
      </div>
    </Link>
  );
}

function Group({
  which,
  items,
  myTeamIds,
}: {
  which: MatchGroupKey;
  items: MatchView[];
  myTeamIds: Set<string>;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h2 className={styles.groupTitle}>{GROUP_LABEL[which]}</h2>
        <span className={styles.groupCount}>{items.length}</span>
      </div>
      <div className={styles.list}>
        {items.map((v) => (
          <MatchRow key={v.match.id} view={v} myTeamIds={myTeamIds} />
        ))}
      </div>
    </section>
  );
}

export function MatchList({
  groups,
  total,
  myTeamIds,
}: {
  groups: MatchGroups;
  total: number;
  myTeamIds: string[];
}) {
  const ids = new Set(myTeamIds);

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <p>No scrims booked yet.</p>
        <Link href={ROUTES.scrims} className={styles.emptyLink}>
          Find a scrim →
        </Link>
      </div>
    );
  }

  return (
    <>
      <Group which="upcoming" items={groups.upcoming} myTeamIds={ids} />
      <Group which="awaiting" items={groups.awaiting} myTeamIds={ids} />
      <Group which="history" items={groups.history} myTeamIds={ids} />
    </>
  );
}
