import { getGame, isGameId } from "@/features/games/config";
import { acceptRequest } from "./actions";
import { relativeTime } from "./format";
import { RequestActionButton } from "./RequestActions";
import { kindLabel } from "./types";
import type { OpenRequestView } from "./queries";
import styles from "./mentorship.module.css";

function gameLabel(gameId: string | null): string {
  return gameId && isGameId(gameId) ? getGame(gameId).label : "Any game";
}

/** One open request on the mentor board. */
export function OpenRequestCard({ request }: { request: OpenRequestView }) {
  const { id, kind, game_id, notes, created_at, menteeHandle } = request;

  return (
    <article className={styles.card}>
      <div className={styles.badgeRow}>
        <span className={styles.badge}>{kindLabel(kind)}</span>
        <span className={styles.gameTag}>{gameLabel(game_id)}</span>
        <span className={styles.time}>{relativeTime(created_at)}</span>
      </div>

      <div className={styles.mentorLine}>
        <span className={styles.metaLabel}>FROM</span>
        {menteeHandle ? `@${menteeHandle}` : "a player"}
      </div>

      {notes && <p className={styles.notes}>{notes}</p>}

      <div className={styles.actionRow}>
        <RequestActionButton
          action={acceptRequest}
          id={id}
          label="Offer to mentor"
          pendingLabel="Sending…"
          variant="primary"
        />
      </div>
    </article>
  );
}
