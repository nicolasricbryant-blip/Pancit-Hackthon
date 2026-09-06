import type { Tables } from "@/lib/db/types";
import type { GameId } from "@/features/games/config";

/** Raw DB rows. */
export type TeamRow = Tables<"teams">;
export type TeamMemberRow = Tables<"team_members">;
export type RatingRow = Tables<"ratings">;
export type ReliabilityRow = Tables<"reliability_scores">;
export type StandingRow = Tables<"community_standing">;

/** Roster roles — mirrors the `team_members.role` CHECK constraint, ordered. */
export const ROSTER_ROLES = [
  "captain",
  "starter",
  "substitute",
  "coach",
  "manager",
] as const;
export type RosterRole = (typeof ROSTER_ROLES)[number];

export function isRosterRole(v: string): v is RosterRole {
  return (ROSTER_ROLES as readonly string[]).includes(v);
}

/** Short human label for a roster role. */
export const ROLE_LABEL: Record<RosterRole, string> = {
  captain: "Captain",
  starter: "Starter",
  substitute: "Substitute",
  coach: "Coach",
  manager: "Manager",
};

/** School as needed by pickers / cards. */
export interface SchoolLite {
  id: string;
  name: string;
  short_name: string | null;
  region: string | null;
}

/** One row in the `/teams` browse grid. */
export interface TeamListItem {
  id: string;
  name: string;
  tag: string | null;
  region: string | null;
  game_id: GameId;
  school: { name: string; short_name: string | null } | null;
  rating: number;
  reliability: number;
  standing: number;
}

/** A roster entry joined to its profile. */
export interface RosterMember {
  id: string;
  profileId: string;
  role: RosterRole;
  jerseyName: string | null;
  displayName: string | null;
  handle: string | null;
}

/** Everything the team profile page renders. */
export interface TeamProfile {
  id: string;
  name: string;
  tag: string | null;
  bio: string | null;
  region: string | null;
  game_id: GameId;
  handlerId: string | null;
  school: { id: string; name: string; short_name: string | null } | null;
  competitive: {
    rating: number;
    wins: number;
    losses: number;
    matchesPlayed: number;
    reliability: number;
  };
  community: {
    points: number;
    eventsAttended: number;
    eventsHosted: number;
  };
  roster: RosterMember[];
}

/** Result contract shared by every teams server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Normalise a team tag: uppercase, strip non-alphanumerics, max 5 chars. */
export function normalizeTag(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

/** Display a numeric rating as a whole number. */
export function ratingText(n: number): string {
  return Math.round(n).toString();
}

/** Display a 0–100 score as a whole percentage. */
export function pctText(n: number): string {
  return Math.round(n).toString();
}
