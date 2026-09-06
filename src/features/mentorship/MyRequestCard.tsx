import { getGame, isGameId } from "@/features/games/config";
import { cancelRequest, completeRequest } from "./actions";
import { relativeTime } from "./format";
import { RequestActionButton } from "./RequestActions";
import { kindLabel, statusLabel } from "./types";
import type { MyRequestView } from "./queries";
import styles from "./mentorship.module.css";

function gameLabel(gameId: string | null): string {
  return gameId && isGameId(gameId) ? getGame(gameId).label : "Any game";
}

/** One of the signed-in user's own mentorship requests. */
export function MyRequestCard({ request }: { request: MyRequestView }) {
  const { id, kind, game_id, status, notes, created_at, mentorHandle } = request;
  const canCancel = status === "open" || status === "matched";
  const canComplete = status === "matched";

  return (
    <article className={styles.card}>
      <div className={styles.badgeRow}>
        <span className={styles.badge}>{kindLabel(kind)}</span>
        <span className={styles.gameTag}>{gameLabel(game_id)}</span>
        <span className={styles.statusPill} data-status={status}>
          {statusLabel(status)}
        </span>
        <span className={styles.time}>{relativeTime(created_at)}</span>
      </div>

      {notes && <p className={styles.notes}>{notes}</p>}

      {mentorHandle && status !== "cancelled" && (
        <div className={styles.mentorLine}>
          <span className={styles.metaLabel}>MENTOR</span>@{mentorHandle}
        </div>
      )}

      {(canCancel || canComplete) && (
        <div className={styles.actionRow}>
          {canComplete && (
            <RequestActionButton
              action={completeRequest}
              id={id}
              label="Mark completed"
              pendingLabel="Saving…"
              variant="primary"
            />
          )}
          {canCancel && (
            <RequestActionButton
              action={cancelRequest}
              id={id}
              label="Cancel request"
              pendingLabel="Cancelling…"
            />
          )}
        </div>
      )}
    </article>
  );
}
