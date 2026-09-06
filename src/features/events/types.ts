import type { Tables } from "@/lib/db/types";

/** DB row aliases. */
export type EventRow = Tables<"events">;
export type EventRsvpRow = Tables<"event_rsvps">;
export type AnnouncementRow = Tables<"announcements">;
export type SchoolRow = Tables<"schools">;

/** The seven event kinds stored in `events.kind`. */
export type EventKind =
  | "lan"
  | "watch_party"
  | "bootcamp"
  | "tournament_online"
  | "tournament_onsite"
  | "meetup"
  | "hybrid_finals";

export const EVENT_KINDS: EventKind[] = [
  "lan",
  "watch_party",
  "bootcamp",
  "tournament_online",
  "tournament_onsite",
  "meetup",
  "hybrid_finals",
];

/** Human-readable label for each kind. */
export const KIND_LABEL: Record<EventKind, string> = {
  lan: "Campus LAN",
  watch_party: "Watch Party",
  bootcamp: "Bootcamp",
  tournament_online: "Online Tournament",
  tournament_onsite: "Onsite Tournament",
  meetup: "Meetup",
  hybrid_finals: "Hybrid Finals",
};

/** Safe label lookup for an unknown DB string. */
export function kindLabel(kind: string): string {
  return (KIND_LABEL as Record<string, string>)[kind] ?? kind;
}

/** RSVP status values stored in `event_rsvps.status`. */
export type RsvpStatus = "going" | "interested" | "waitlist" | "cancelled";

export function isRsvpStatus(value: string | null | undefined): value is RsvpStatus {
  return (
    value === "going" ||
    value === "interested" ||
    value === "waitlist" ||
    value === "cancelled"
  );
}

/** An event row plus derived, viewer-relative fields for the feed/detail. */
export interface EventView extends EventRow {
  goingCount: number;
  viewerStatus: RsvpStatus | null;
}
