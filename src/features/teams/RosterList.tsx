import { ROLE_LABEL, type RosterMember } from "./types";
import styles from "./teams.module.css";

/** Read-only roster for the public team profile. */
export function RosterList({ roster }: { roster: RosterMember[] }) {
  if (roster.length === 0) {
    return <p className={styles.rosterEmpty}>No roster set yet.</p>;
  }

  return (
    <ul className={styles.roster}>
      {roster.map((m) => (
        <li key={m.id} className={styles.rosterRow}>
          <span className={styles.rosterName}>
            {m.jerseyName || m.displayName || "Unknown player"}
          </span>
          {m.handle && <span className={styles.rosterHandle}>@{m.handle}</span>}
          <span className={styles.rolePill} data-role={m.role}>
            {ROLE_LABEL[m.role]}
          </span>
        </li>
      ))}
    </ul>
  );
}
