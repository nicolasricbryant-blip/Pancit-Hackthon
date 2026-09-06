import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/features/auth/session";
import type { GameId } from "@/features/games/config";
import {
  isRsvpStatus,
  type AnnouncementRow,
  type EventRow,
  type EventView,
  type RsvpStatus,
  type SchoolRow,
} from "./types";
import { isPast, startKey } from "./format";

/** `game_id = <game> OR game_id IS NULL` — the scoping rule for feeds. */
function gameOrNull(game: GameId): string {
  return `game_id.eq.${game},game_id.is.null`;
}

/** Tally `status='going'` RSVPs per event id, plus the viewer's own status. */
async function decorate(
  events: EventRow[],
): Promise<EventView[]> {
  if (events.length === 0) return [];
  const supabase = await createClient();
  const ids = events.map((e) => e.id);

  const { data: going } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .eq("status", "going")
    .in("event_id", ids);

  const goingByEvent = new Map<string, number>();
  for (const row of going ?? []) {
    goingByEvent.set(row.event_id, (goingByEvent.get(row.event_id) ?? 0) + 1);
  }

  const viewerByEvent = new Map<string, RsvpStatus>();
  const user = await getUser();
  if (user) {
    const { data: mine } = await supabase
      .from("event_rsvps")
      .select("event_id, status")
      .eq("profile_id", user.id)
      .in("event_id", ids);
    for (const row of mine ?? []) {
      if (isRsvpStatus(row.status)) viewerByEvent.set(row.event_id, row.status);
    }
  }

  return events.map((e) => ({
    ...e,
    goingCount: goingByEvent.get(e.id) ?? 0,
    viewerStatus: viewerByEvent.get(e.id) ?? null,
  }));
}

export interface EventsFeed {
  upcoming: EventView[];
  past: EventView[];
}

/** Events for the selected game (or cross-game), split upcoming / past. */
export async function getEventsForGame(game: GameId): Promise<EventsFeed> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(gameOrNull(game))
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`events query failed: ${error.message}`);

  const decorated = await decorate(data ?? []);
  const upcoming: EventView[] = [];
  const past: EventView[] = [];
  for (const e of decorated) {
    (isPast(e.starts_at, e.ends_at) ? past : upcoming).push(e);
  }
  upcoming.sort((a, b) => startKey(a.starts_at) - startKey(b.starts_at));
  past.sort((a, b) => startKey(b.starts_at) - startKey(a.starts_at));
  return { upcoming, past };
}

/** Announcements for the selected game (or platform-wide): pinned first, newest first. */
export async function getAnnouncementsForGame(
  game: GameId,
): Promise<AnnouncementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .or(gameOrNull(game))
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`announcements query failed: ${error.message}`);
  return data ?? [];
}

export interface Attendee {
  profileId: string;
  handle: string | null;
  displayName: string | null;
  checkedInAt: string | null;
}

export interface EventDetail {
  event: EventRow;
  hostHandle: string | null;
  school: Pick<SchoolRow, "name" | "short_name" | "region"> | null;
  goingCount: number;
  attendees: Attendee[];
  viewerId: string | null;
  viewerStatus: RsvpStatus | null;
  viewerCheckedInAt: string | null;
}

/** Full detail bundle for one event, or null when it does not exist. */
export async function getEventDetail(
  eventId: string,
): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return null;

  let hostHandle: string | null = null;
  if (event.host_profile_id) {
    const { data: host } = await supabase
      .from("profiles")
      .select("handle, display_name")
      .eq("id", event.host_profile_id)
      .maybeSingle();
    hostHandle = host?.handle ?? host?.display_name ?? null;
  }

  let school: EventDetail["school"] = null;
  if (event.school_id) {
    const { data: s } = await supabase
      .from("schools")
      .select("name, short_name, region")
      .eq("id", event.school_id)
      .maybeSingle();
    school = s ?? null;
  }

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("profile_id, status, checked_in_at")
    .eq("event_id", eventId);

  const going = (rsvps ?? []).filter((r) => r.status === "going");

  const nameById = new Map<
    string,
    { handle: string | null; display_name: string | null }
  >();
  if (going.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .in(
        "id",
        going.map((r) => r.profile_id),
      );
    for (const p of people ?? []) {
      nameById.set(p.id, { handle: p.handle, display_name: p.display_name });
    }
  }

  const attendees: Attendee[] = going.map((r) => ({
    profileId: r.profile_id,
    handle: nameById.get(r.profile_id)?.handle ?? null,
    displayName: nameById.get(r.profile_id)?.display_name ?? null,
    checkedInAt: r.checked_in_at,
  }));

  const user = await getUser();
  let viewerStatus: RsvpStatus | null = null;
  let viewerCheckedInAt: string | null = null;
  if (user) {
    const mine = (rsvps ?? []).find((r) => r.profile_id === user.id);
    if (mine && isRsvpStatus(mine.status)) viewerStatus = mine.status;
    viewerCheckedInAt = mine?.checked_in_at ?? null;
  }

  return {
    event,
    hostHandle,
    school,
    goingCount: going.length,
    attendees,
    viewerId: user?.id ?? null,
    viewerStatus,
    viewerCheckedInAt,
  };
}

/** Schools list for the create-event form combobox. */
export async function getSchools(): Promise<
  Pick<SchoolRow, "id" | "name" | "short_name">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name, short_name")
    .order("name", { ascending: true });
  return data ?? [];
}
