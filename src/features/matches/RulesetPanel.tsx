import { Fragment } from "react";
import styles from "./matches.module.css";
import { parseRuleset, rulesetRows } from "./types";
import { RulesetForm } from "./RulesetForm";
import type { MatchView, ViewerSide } from "./types";

interface Props {
  view: MatchView;
  viewerSide: ViewerSide;
}

/**
 * Agreed ruleset. Editable only while status = 'booked', by a handler of either
 * team, and only before both sides have confirmed. Otherwise a locked spec table.
 */
export function RulesetPanel({ view, viewerSide }: Props) {
  const { match } = view;
  const ruleset = parseRuleset(match.ruleset);
  const bothConfirmed = match.team_a_confirmed && match.team_b_confirmed;
  const canEdit =
    match.status === "booked" && viewerSide !== null && !bothConfirmed;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Agreed ruleset</h2>
        <span className={styles.lockTag}>
          {match.status === "booked" ? (canEdit ? "Editable" : "Locked") : "Locked"}
        </span>
      </div>

      <div className={styles.spec}>
        {rulesetRows(ruleset).map((r) => (
          <Fragment key={r.key}>
            <span className={styles.specKey}>{r.key}</span>
            <span className={styles.specVal}>{r.value}</span>
          </Fragment>
        ))}
      </div>

      {canEdit && <RulesetForm matchId={match.id} initial={ruleset} />}
      {!canEdit && match.status === "booked" && viewerSide === null && (
        <p className={styles.readOnlyNote}>Only a team handler can change the ruleset.</p>
      )}
    </section>
  );
}
