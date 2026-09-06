import styles from "./matches.module.css";
import { ResultActions } from "./ResultActions";
import type { MatchView, ViewerSide } from "./types";

interface Props {
  view: MatchView;
  viewerSide: ViewerSide;
}

function teamLabel(name: string, tag: string | null): string {
  return tag ? `${name} [${tag}]` : name;
}

/**
 * Result reporting + dual confirmation. Ratings are intentionally untouched here
 * — advancing a result only flips `status` and sets `winner`.
 */
export function ResultPanel({ view, viewerSide }: Props) {
  const { match, teamA, teamB } = view;
  const isHandler = viewerSide !== null;
  const aLabel = teamLabel(teamA.name, teamA.tag);
  const bLabel = teamLabel(teamB.name, teamB.tag);
  const scoreLine =
    match.score_a != null && match.score_b != null
      ? `${teamA.tag ?? teamA.name} ${match.score_a} – ${match.score_b} ${teamB.tag ?? teamB.name}`
      : null;

  // Which named team(s) have confirmed so far.
  const confirmedNames = [
    match.team_a_confirmed ? teamA.name : null,
    match.team_b_confirmed ? teamB.name : null,
  ].filter(Boolean);
  const waitingName = !match.team_a_confirmed
    ? teamA.name
    : !match.team_b_confirmed
      ? teamB.name
      : null;

  const viewerSideConfirmed =
    viewerSide === "a"
      ? match.team_a_confirmed
      : viewerSide === "b"
        ? match.team_b_confirmed
        : viewerSide === "both"
          ? match.team_a_confirmed && match.team_b_confirmed
          : false;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Result</h2>
      </div>

      {/* ---- BOOKED -------------------------------------------------------- */}
      {match.status === "booked" && (
        <>
          <p className={styles.resultState}>
            No result yet. A handler of either team reports the series score once
            the match is done.
          </p>
          {isHandler ? (
            <ResultActions
              matchId={match.id}
              mode="report"
              teamALabel={aLabel}
              teamBLabel={bLabel}
            />
          ) : (
            <p className={styles.readOnlyNote}>Only a team handler can report the result.</p>
          )}
        </>
      )}

      {/* ---- REPORTED ---------------------------------------------------- */}
      {match.status === "reported" && (
        <>
          {scoreLine && <p className={styles.scoreLine}>{scoreLine}</p>}
          <p className={styles.resultState}>
            <strong>Reported.</strong>{" "}
            {confirmedNames.length > 0
              ? `${confirmedNames.join(" & ")} confirmed`
              : "No confirmations yet"}
            {waitingName ? ` · waiting for ${waitingName} to confirm.` : "."}
          </p>
          {isHandler ? (
            <ResultActions
              matchId={match.id}
              mode="confirm"
              teamALabel={aLabel}
              teamBLabel={bLabel}
              canConfirm={!viewerSideConfirmed}
            />
          ) : (
            <p className={styles.readOnlyNote}>
              Only a handler of {teamA.name} or {teamB.name} can confirm or dispute.
            </p>
          )}
        </>
      )}

      {/* ---- CONFIRMED ------------------------------------------------- */}
      {match.status === "confirmed" && (
        <>
          {scoreLine && <p className={styles.scoreLine}>{scoreLine}</p>}
          <p className={styles.resultState}>
            <strong>Result confirmed.</strong>{" "}
            {match.winner === teamA.id
              ? `${teamA.name} won.`
              : match.winner === teamB.id
                ? `${teamB.name} won.`
                : "No winner recorded."}
          </p>
          <p className={styles.readOnlyNote}>
            Ratings are updated separately by a later system job — not here.
          </p>
        </>
      )}

      {/* ---- DISPUTED ------------------------------------------------- */}
      {match.status === "disputed" && (
        <>
          {scoreLine && <p className={styles.scoreLine}>{scoreLine}</p>}
          <p className={styles.resultState}>
            <strong>Result disputed.</strong> No resolution flow this milestone — a
            handler can re-report the correct series score below.
          </p>
          {isHandler && (
            <ResultActions
              matchId={match.id}
              mode="report"
              teamALabel={aLabel}
              teamBLabel={bLabel}
              initialScoreA={match.score_a}
              initialScoreB={match.score_b}
            />
          )}
        </>
      )}

      {/* ---- CANCELLED ---------------------------------------------- */}
      {match.status === "cancelled" && (
        <p className={styles.resultState}>
          <strong>Match cancelled.</strong>
        </p>
      )}
    </section>
  );
}
