import type { Tables } from "@/lib/db/types";
import type { GameId } from "@/features/games/config";

/** Raw DB rows. */
export type TournamentRow = Tables<"tournaments">;
export type EntrantRow = Tables<"tournament_entrants">;
export type BracketMatchRow = Tables<"bracket_matches">;

/** Tournament lifecycle — mirrors the `tournaments.status` CHECK. */
export type TournamentStatus =
  | "registration"
  | "live"
  | "completed"
  | "cancelled";

/** Reach of a tournament — mirrors the `tournaments.scope` CHECK. */
export type TournamentScope = "local" | "regional" | "nationwide";

/** Per-node state in the bracket — mirrors `bracket_matches.status`. */
export type BracketMatchStatus = "pending" | "ready" | "reported" | "confirmed";

/** Bracket sizes the create form offers. */
export const SIZE_OPTIONS = [4, 8, 16, 32] as const;
export type BracketSize = (typeof SIZE_OPTIONS)[number];

export const SCOPES: TournamentScope[] = ["local", "regional", "nationwide"];

export const SCOPE_LABEL: Record<TournamentScope, string> = {
  local: "Local",
  regional: "Regional",
  nationwide: "Nationwide",
};

export const STATUS_LABEL: Record<string, string> = {
  registration: "Registration",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Per-node status labels for the bracket tree. */
export const BRACKET_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  ready: "Ready",
  reported: "Reported",
  confirmed: "Confirmed",
};

export function isBracketSize(n: number): n is BracketSize {
  return (SIZE_OPTIONS as readonly number[]).includes(n);
}

export function isScope(v: string): v is TournamentScope {
  return (SCOPES as string[]).includes(v);
}

/** Tournament slug rule: 2–39 chars, lowercase alnum + hyphen, no leading hyphen. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}$/;

export function isValidSlug(v: string): boolean {
  return SLUG_RE.test(v);
}

/** Suggest a slug from a free-text name. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 39)
    .replace(/-+$/, "");
}

/** Number of rounds in a single-elim bracket of `size` teams. */
export function roundsForSize(size: number): number {
  return Math.max(1, Math.round(Math.log2(size)));
}

/** Human label for a round: "Final", "Semifinals", "Quarterfinals", else "Round N". */
export function roundLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  if (fromEnd <= 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

/** A team reduced to what cards / nodes render. */
export interface TeamLite {
  id: string;
  name: string;
  tag: string | null;
}

/** One row in the `/brackets` browse grid. */
export interface TournamentListItem {
  id: string;
  slug: string;
  name: string;
  size: number;
  scope: string;
  region: string | null;
  status: string;
  startsAt: string | null;
  entrantCount: number;
  champion: TeamLite | null;
}

/** One registered team on the tournament page. */
export interface EntrantView {
  id: string;
  teamId: string;
  seed: number | null;
  name: string;
  tag: string | null;
  rating: number;
  registeredBy: string | null;
}

/** One match node in the bracket tree. */
export interface BracketNode {
  id: string;
  round: number;
  slot: number;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  status: string;
}

/** Everything the tournament page + manage page render. */
export interface TournamentDetail {
  id: string;
  slug: string;
  name: string;
  gameId: GameId;
  size: number;
  scope: string;
  region: string | null;
  status: string;
  startsAt: string | null;
  hostProfileId: string | null;
  hostHandle: string | null;
  ratingEffect: boolean;
  champion: TeamLite | null;
  entrants: EntrantView[];
  rounds: number;
  bracket: BracketNode[];
}

/** Result contract shared by every brackets server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };
