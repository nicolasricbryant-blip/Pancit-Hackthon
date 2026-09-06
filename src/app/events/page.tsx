import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { getCurrentProfile } from "@/features/auth/session";
import {
  getAnnouncementsForGame,
  getEventsForGame,
} from "@/features/events/queries";
import { EventsFeed } from "@/features/events/EventsFeed";
import { AnnouncementsBoard } from "@/features/events/AnnouncementsBoard";
import { ExamBanner } from "@/features/events/ExamBanner";
import styles from "@/features/events/events.module.css";

export const metadata: Metadata = { title: "Events" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);

  const [feed, announcements, profile] = await Promise.all([
    getEventsForGame(game),
    getAnnouncementsForGame(game),
    getCurrentProfile(),
  ]);

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className={styles.scope} style={scopeStyle} data-game={game}>
      <div className={styles.wrap}>
        {profile?.exam_mode && <ExamBanner />}

        <div className={styles.headRow}>
          <div>
            <h1 className={styles.pageTitle}>Events &amp; Meetups</h1>
            <p className={styles.pageSub}>
              LANs, watch parties, bootcamps, and tournaments for {config.label}{" "}
              and the wider PH collegiate scene. RSVP, then show up.
            </p>
          </div>
          <Link href="/events/new" className={styles.newBtn}>
            Host an event
          </Link>
        </div>

        <div className={styles.layout}>
          <EventsFeed feed={feed} />
          <AnnouncementsBoard announcements={announcements} />
        </div>
      </div>
    </div>
  );
}
