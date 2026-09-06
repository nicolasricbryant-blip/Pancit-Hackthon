import { pctText, ratingText, type TeamProfile } from "./types";
import styles from "./teams.module.css";

/**
 * The two co-equal pillars of a team's standing. Competitive and Community get
 * identical visual weight — side by side on desktop, stacked on mobile.
 */
export function StatPanels({
  competitive,
  community,
}: Pick<TeamProfile, "competitive" | "community">) {
  return (
    <div className={styles.panels}>
      <section className={styles.panel} aria-labelledby="panel-competitive">
        <h2 id="panel-competitive" className={styles.panelTitle}>
          Competitive
        </h2>
        <p className={styles.panelBig}>
          <span className={styles.panelBigNum}>{ratingText(competitive.rating)}</span>
          <span className={styles.panelBigUnit}>rating</span>
        </p>
        <dl className={styles.panelRows}>
          <div className={styles.panelRow}>
            <dt>Win–Loss</dt>
            <dd className={styles.num}>
              {competitive.wins}–{competitive.losses}
            </dd>
          </div>
          <div className={styles.panelRow}>
            <dt>Matches played</dt>
            <dd className={styles.num}>{competitive.matchesPlayed}</dd>
          </div>
          <div className={styles.panelRow}>
            <dt>Reliability</dt>
            <dd className={styles.num}>{pctText(competitive.reliability)}%</dd>
          </div>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="panel-community">
        <h2 id="panel-community" className={styles.panelTitle}>
          Community Standing
        </h2>
        <p className={styles.panelBig}>
          <span className={styles.panelBigNum}>{community.points}</span>
          <span className={styles.panelBigUnit}>points</span>
        </p>
        <dl className={styles.panelRows}>
          <div className={styles.panelRow}>
            <dt>Events attended</dt>
            <dd className={styles.num}>{community.eventsAttended}</dd>
          </div>
          <div className={styles.panelRow}>
            <dt>Events hosted</dt>
            <dd className={styles.num}>{community.eventsHosted}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
