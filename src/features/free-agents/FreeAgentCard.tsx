import { relativeTime } from "@/features/events/format";
import { lookingForLabel, type FreeAgentPostView } from "./types";
import { CloseListingButton } from "./CloseListingButton";
import styles from "./free-agents.module.css";

interface Props {
  post: FreeAgentPostView;
  owned: boolean;
}

/** One listing in the board. Left-accent card, echoing the scrim card idiom. */
export function FreeAgentCard({ post, owned }: Props) {
  const {
    id,
    lookingFor,
    rankLabel,
    rolesWanted,
    blurb,
    createdAt,
    handle,
    displayName,
    team,
  } = post;

  const who = handle ? `@${handle}` : (displayName ?? "Unknown player");
  const secondary =
    handle && displayName && displayName !== handle ? displayName : null;

  return (
    <article className="scrim-card">
      <div className={styles.topRow}>
        <div className={styles.who}>
          <span className={styles.handle}>{who}</span>
          {secondary && <span className={styles.name}>{secondary}</span>}
          {team && (
            <span className={styles.name}>
              {team.tag ? `[${team.tag}] ` : ""}
              {team.name}
            </span>
          )}
        </div>
        <span className={styles.pill}>{lookingForLabel(lookingFor)}</span>
      </div>

      {rankLabel && (
        <div className={styles.rank}>
          <span className={styles.rankTag}>RANK</span>
          {rankLabel}
        </div>
      )}

      {rolesWanted.length > 0 && (
        <div className="chip-row">
          {rolesWanted.map((r) => (
            <span key={r} className="chip">
              {r}
            </span>
          ))}
        </div>
      )}

      {blurb && <p className={styles.blurb}>{blurb}</p>}

      <div className={styles.footRow}>
        <span className={styles.time}>posted {relativeTime(createdAt)}</span>
        {owned && <CloseListingButton postId={id} />}
      </div>
    </article>
  );
}
