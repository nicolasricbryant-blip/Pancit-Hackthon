import { createClient } from "@/lib/supabase/server";
import { fmtDay, relativeTime } from "@/features/events/format";
import styles from "./H2HPanel.module.css";

export interface H2HPanelProps {
  gameId: string;
  teamA: string;
  teamB: string;
  teamAName: string;
  teamBName: string;
}

/**
 * All-time record between the two teams of a booked scrim. Reads the
 * `head_to_head` view (confirmed scrims only, team ids stored lo/hi-ordered)
 * plus the last few confirmed meetings from `scrim_matches`.
 */
export async function H2HPanel({
  gameId,
  teamA,
  teamB,
  teamAName,
  teamBName,
}: H2HPanelProps) {
  // The view stores each pair once, ordered so team_lo < team_hi as raw uuid text.
  const lo = teamA < teamB ? teamA : teamB;
  const hi = teamA < teamB ? teamB : teamA;

  const supabase = await createClient();

  const { data: record } = await supabase
    .from("head_to_head")
    .select("played, lo_wins, hi_wins, last_played")
    .eq("game_id", gameId)
    .eq("team_lo", lo)
    .eq("team_hi", hi)
    .maybeSingle();

  if (!record) {
    return (
      <div className={styles.wrap}>
        <section className={styles.panel}>
          <div className={styles.head}>
            <h2 className={styles.title}>Head to head</h2>
          </div>
          <p className={styles.empty}>
            No confirmed scrims between these teams yet.
          </p>
        </section>
      </div>
    );
  }

  // Per-team wins: teamA's tally is lo_wins when teamA sorted low, else hi_wins.
  const aWins = (teamA === lo ? record.lo_wins : record.hi_wins) ?? 0;
  const bWins = (teamB === lo ? record.lo_wins : record.hi_wins) ?? 0;
  const played = record.played ?? 0;
  const aLead = aWins > bWins;
  const bLead = bWins > aWins;

  const { data: meetingsData } = await supabase
    .from("scrim_matches")
    .select("id, scheduled_at, team_a, team_b, score_a, score_b, winner")
    .eq("game_id", gameId)
    .eq("status", "confirmed")
    .in("team_a", [teamA, teamB])
    .in("team_b", [teamA, teamB])
    .order("scheduled_at", { ascending: false })
    .limit(5);
  const meetings = meetingsData ?? [];

  const nameOf = (id: string | null): string =>
    id === teamA ? teamAName : id === teamB ? teamBName : "—";

  return (
    <div className={styles.wrap}>
      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Head to head</h2>
          <span className={styles.meta}>
            {played} {played === 1 ? "meeting" : "meetings"}
            {record.last_played
              ? ` · last met ${relativeTime(record.last_played)}`
              : ""}
          </span>
        </div>

        <div className={styles.record}>
          <div className={`${styles.team} ${aLead ? styles.lead : bLead ? styles.trail : ""}`}>
            <span className={styles.teamName}>{teamAName}</span>
          </div>
          <div className={styles.score}>
            <span className={aLead ? styles.scoreLead : ""}>{aWins}</span>
            <span className={styles.dash}>&ndash;</span>
            <span className={bLead ? styles.scoreLead : ""}>{bWins}</span>
          </div>
          <div
            className={`${styles.team} ${styles.teamRight} ${
              bLead ? styles.lead : aLead ? styles.trail : ""
            }`}
          >
            <span className={styles.teamName}>{teamBName}</span>
          </div>
        </div>

        {meetings.length > 0 && (
          <div className={styles.recent}>
            <span className={styles.lbl}>Recent meetings</span>
            <ul className={styles.list}>
              {meetings.map((m) => (
                <li key={m.id} className={styles.item}>
                  <span className={styles.date}>{fmtDay(m.scheduled_at)}</span>
                  <span className={styles.itemScore}>
                    {m.score_a ?? 0}&ndash;{m.score_b ?? 0}
                  </span>
                  <span className={styles.winner}>
                    {m.winner == null ? (
                      "Draw"
                    ) : (
                      <strong>{nameOf(m.winner)}</strong>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
