import type { Tables } from "@/lib/db/types";

/** Raw DB row. */
export type FreeAgentPostRow = Tables<"free_agent_posts">;

/** `free_agent_posts.looking_for` values. */
export type LookingFor = "team" | "player";

export function isLookingFor(value: string | null | undefined): value is LookingFor {
  return value === "team" || value === "player";
}

/** Card / pill label for a `looking_for` value. */
export const LOOKING_FOR_LABEL: Record<LookingFor, string> = {
  team: "Seeking a team",
  player: "Seeking a player",
};

/** Safe label lookup for an unknown DB string. */
export function lookingForLabel(value: string): string {
  return (LOOKING_FOR_LABEL as Record<string, string>)[value] ?? value;
}

/** Post status values stored in `free_agent_posts.status`. */
export type PostStatus = "open" | "closed";

/**
 * Roles a listing can want. The game configs carry rank tiers but no role
 * concepts, so the board keeps this shared static list across all four titles.
 */
export const ROLE_OPTIONS = [
  "IGL",
  "Entry",
  "Support",
  "Flex",
  "Jungle",
  "Gold Lane",
  "Mid",
  "EXP",
  "Roam",
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

/** One free-agent post joined to its author and (optional) team. */
export interface FreeAgentPostView {
  id: string;
  profileId: string;
  lookingFor: LookingFor;
  rankLabel: string | null;
  rolesWanted: string[];
  blurb: string | null;
  createdAt: string;
  handle: string | null;
  displayName: string | null;
  team: { name: string; tag: string | null } | null;
}

/** Result contract shared by every free-agents server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Max characters allowed in a listing blurb. */
export const BLURB_MAX = 280;
