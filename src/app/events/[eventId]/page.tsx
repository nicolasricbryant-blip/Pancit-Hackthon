import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/features/auth/session";
import { isAdmin } from "@/features/auth/roles";
import { getEventDetail } from "@/features/events/queries";
import { EventDetailView } from "@/features/events/EventDetailView";
import { kindLabel } from "@/features/events/types";
import styles from "@/features/events/events.module.css";

type Params = Promise<{ eventId: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { eventId } = await params;
  const detail = await getEventDetail(eventId);
  if (!detail) return { title: "Event not found" };
  return {
    title: detail.event.title,
    description: `${kindLabel(detail.event.kind)} · ${detail.event.host_org ?? "TAMBAYAN"}`,
  };
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { eventId } = await params;
  const sp = await searchParams;
  const detail = await getEventDetail(eventId);
  if (!detail) notFound();

  const profile = await getCurrentProfile();
  const isHost =
    !!profile && detail.event.host_profile_id === profile.id;
  const canManage = isHost || isAdmin(profile);
  const game = detail.event.game_id ?? "mlbb";
  const justCheckedIn = sp.checkedin === "1";
  // Set by the checkin route (route.ts) on a failed scan — a wrong/expired
  // code, or scanning without an RSVP of "going" — so the page can show a
  // real error instead of looking like the tap did nothing.
  const checkinError: "err" | "notgoing" | null =
    sp.checkin === "err" ? "err" : sp.checkin === "notgoing" ? "notgoing" : null;

  const scopeStyle = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  } as React.CSSProperties;

  return (
    <div className={styles.scope} style={scopeStyle} data-game={game}>
      <EventDetailView
        detail={detail}
        canManage={canManage}
        isAuthed={!!profile}
        justCheckedIn={justCheckedIn}
        checkinError={checkinError}
      />
    </div>
  );
}
