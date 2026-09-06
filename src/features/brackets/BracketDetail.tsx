import Link from "next/link";
import { getGame } from "@/features/games/config";
import { fmtDay } from "@/features/events/format";
import { ratingText } from "@/features/teams/types";
import { BracketTree } from "./BracketTree";
import { EntrantActions } from "./EntrantActions";
import {
  SCOPE_LABEL,
  STATUS_LABEL,
  type TournamentDetail,
} from "./types";
import styles from "./brackets.module.css";

interface Props {
  detail: TournamentDetail;
  viewerId: string | null;
  /** Teams the viewer handles in this game that aren't registered. */
  eligible: { id: string; name: string }[];
  /** Teams the viewer handles that are already registered. */
  mine: { id: string; name: string }[];
}

export function BracketDetail({ detail, viewerId, eligible, mine }: Props) {
  const game = getGame(detail.gameId);
  const scope =
    SCOPE_LABEL[detail.scope as keyof typeof SCOPE_LABEL] ?? detail.scope;
  const isHost = viewerId != null && detail.hostProfileId === viewerId;
  const showBracket =
    detail.status === "live" || detail.status === "completed";
  const seeded = detail.entrants.some((e) => e.seed != null);

  return (
    <div className={styles.wrap}>
      <Link href="/brackets" className={styles.backLink}>
        ← Brackets
      </Link>

      <header className={styles.detailHead}>
        <div className={styles.detailNameRow}>
          <h1 className={styles.detailName}>{detail.name}</h1>
          <span className={styles.statusPill} data-status={detail.status}>
            {STATUS_LABEL[detail.status] ?? detail.status}
          </span>
        </div>
        <div className={styles.detailMeta}>
          <span>{game.label}</span>
          <span className={styles.sep}>·</span>
          <span>{scope}</span>
          <span className={styles.sep}>·</span>
          <span>{detail.size}-team single-elim</span>
          {detail.region && (
            <>
              <span className={styles.sep}>·</span>
              <span>{detail.region}</span>
            </>
          )}
          <span className={styles.sep}>·</span>
          <span>Starts {fmtDay(detail.startsAt)}</span>
          {detail.hostHandle && (
            <>
              <span className={styles.sep}>·</span>
              <span>Host @{detail.hostHandle}</span>
            </>
          )}
          {!detail.ratingEffect && (
            <>
              <span className={styles.sep}>·</span>
              <span>Unrated</span>
            </>
          )}
        </div>
        {detail.champion && (
          <p className={styles.champLine}>
            <span className={styles.championMark} aria-hidden>
              ★
            </span>{" "}
            Champion: <strong>{detail.champion.name}</strong>
          </p>
        )}
        {isHost && (
          <Link
            href={`/brackets/${detail.slug}/manage`}
            className={styles.manageLink}
          >
            Manage tournament
          </Link>
        )}
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Entrants</h2>
          <span className={styles.sectionCount}>
            {detail.entrants.length}/{detail.size}
          </span>
        </div>

        {detail.entrants.length === 0 ? (
          <p className={styles.readOnlyNote}>No teams registered yet.</p>
        ) : (
          <ul className={styles.entrantList}>
            {detail.entrants.map((e) => (
              <li key={e.id} className={styles.entrantRow}>
                <span className={styles.entrantSeed}>
                  {e.seed != null ? `#${e.seed}` : seeded ? "—" : ""}
                </span>
                <span className={styles.entrantName}>
                  {e.name}
                  {e.tag && (
                    <span className={styles.entrantTag}>{e.tag}</span>
                  )}
                </span>
                <span className={styles.entrantRating}>
                  {ratingText(e.rating)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {detail.status === "registration" && (
          <EntrantActions slug={detail.slug} eligible={eligible} mine={mine} />
        )}
      </section>

      {showBracket && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Bracket</h2>
          <BracketTree
            nodes={detail.bracket}
            rounds={detail.rounds}
            championName={
              detail.status === "completed"
                ? detail.champion?.name ?? null
                : null
            }
          />
        </section>
      )}
    </div>
  );
}
