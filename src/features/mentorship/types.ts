import type { Tables } from "@/lib/db/types";

/** DB row alias. */
export type MentorshipRequest = Tables<"mentorship_requests">;

/** The three kinds of help a mentee can ask for (`mentorship_requests.kind`). */
export type MentorshipKind = "vod_review" | "coaching_session" | "general";

export const MENTORSHIP_KINDS: MentorshipKind[] = [
  "vod_review",
  "coaching_session",
  "general",
];

export const KIND_LABEL: Record<MentorshipKind, string> = {
  vod_review: "VOD review",
  coaching_session: "Coaching session",
  general: "General advice",
};

/** Safe label lookup for an unknown DB string. */
export function kindLabel(kind: string): string {
  return (KIND_LABEL as Record<string, string>)[kind] ?? kind;
}

export function isMentorshipKind(value: string): value is MentorshipKind {
  return (MENTORSHIP_KINDS as string[]).includes(value);
}

/** Lifecycle values stored in `mentorship_requests.status`. */
export type MentorshipStatus = "open" | "matched" | "completed" | "cancelled";

export const STATUS_LABEL: Record<MentorshipStatus, string> = {
  open: "Open",
  matched: "Matched",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusLabel(status: string): string {
  return (STATUS_LABEL as Record<string, string>)[status] ?? status;
}

/** Notes length bounds, shared by the form and the server action. */
export const NOTES_MIN = 10;
export const NOTES_MAX = 500;

/** Uniform server-action return shape. */
export type ActionResult = { ok: true } | { ok: false; error: string };
