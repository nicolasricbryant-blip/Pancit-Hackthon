import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { getCurrentProfile } from "@/features/auth/session";
import { relativeTime } from "@/features/events/format";
import { getLobby, type LobbyMode, type LobbyStatus } from "@/features/lobbies/queries";
import { LobbyCrest } from "@/features/lobbies/LobbyCrest";
import { LobbyRoster } from "@/features/lobbies/LobbyRoster";
import { LobbyActions } from "@/features/lobbies/LobbyActions";
import styles from "../lobbies.module.css";

export const metadata: Metadata = { title: "Lobby" };

type ScopeVars = React.CSSProperties & Record<`--${string}`, string>;

const MODE_LABEL: Record<LobbyMode, string> = {
  ranked: "Ranked",
  casual: "Casual",
  scrim_warmup: "Scrim warm-up",
};

const STATUS_LABEL: Record<LobbyStatus, string> = {
  open: "Open",
  full: "Full",
  closed: "Closed",
  expired: "Expired",
};

export default async function LobbyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lobby = await getLobby(id);
  if (!lobby) notFound();

  const profile = await getCurrentProfile();
  const viewerId = profile?.id ?? null;
  const mine = viewerId
    ? (lobby.members.find((m) => m.profileId === viewerId) ?? null)
    : null;
  const isHost = viewerId != null && viewerId === lobby.hostId;

  const game = coerceGameId(lobby.game);
  const label = getGame(game).label;

  const rankText =
    lobby.rankMin == null && lobby.rankMax == null
      ? "Any rank"
      : `${lobby.rankMin ?? "any"}–${lobby.rankMax ?? "any"}`;

  const openSeats = Math.max(0, lobby.slotsTotal - lobby.activeCount);
  const openRoles = lobby.neededRoles.filter(
    (r) => !lobby.filledRoles.includes(r),
  );
  const live = lobby.status === "open" || lobby.status === "full";

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" data-game={game} style={scopeStyle}>
      <div className="page-wrap">
        <Link href={`/lobbies?game=${game}`} className={styles.back}>
          ← All {label} lobbies
        </Link>

        <header className={styles.detailHead}>
          <LobbyCrest name={lobby.host.name} size={52} />
          <div className={styles.detailWho}>
            <h1 className={styles.detailTitle}>{lobby.title}</h1>
            <p className={styles.detailHost}>
              hosted by {lobby.host.name}
              {lobby.host.handle ? ` · @${lobby.host.handle}` : ""}
            </p>
            <div className={styles.detailBadges}>
              <span className={styles.modeBadge}>{MODE_LABEL[lobby.mode]}</span>
              <span
                className={styles.statusBadge}
                data-status={lobby.status}
              >
                {STATUS_LABEL[lobby.status]}
              </span>
              <span className={styles.rank}>{rankText}</span>
              <span className={styles.metaNote}>
                {lobby.micRequired ? "Mic required" : "Mic optional"}
              </span>
              {live && (
                <span className={styles.metaNote}>
                  expires {relativeTime(lobby.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </header>

        <section className={styles.detailSection}>
          <h2 className={styles.sectionHead}>
            Roster
            <span className={styles.sectionCount}>
              {lobby.activeCount}/{lobby.slotsTotal}
            </span>
          </h2>
          <LobbyRoster
            members={lobby.members}
            hostId={lobby.hostId}
            viewerId={viewerId}
            slotsTotal={lobby.slotsTotal}
            lobbyId={lobby.id}
            status={lobby.status}
          />
        </section>

        <section className={styles.detailSection}>
          <LobbyActions
            lobbyId={lobby.id}
            status={lobby.status}
            slotsTotal={lobby.slotsTotal}
            activeCount={lobby.activeCount}
            viewerId={viewerId}
            viewerMembership={
              mine
                ? { state: mine.state, role: mine.role, readyBy: mine.readyBy }
                : null
            }
            isHost={isHost}
          />
        </section>

        <section className={styles.detailSection}>
          <h2 className={styles.sectionHead}>Needed roles</h2>
          {openSeats === 0 ? (
            <p className={styles.metaNote}>Every slot is filled.</p>
          ) : (
            <div className={styles.roleChips}>
              {lobby.neededRoles.length === 0 ? (
                <span className={styles.roleChipMuted}>
                  {openSeats} open · any role
                </span>
              ) : openRoles.length === 0 ? (
                <span className={styles.roleChipMuted}>
                  {openSeats} open · any role
                </span>
              ) : (
                openRoles.map((r) => (
                  <span key={r} className={styles.roleChip}>
                    {r}
                  </span>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
