import type { GameId } from "@/features/games/config";

export type TimeWindow = "Tonight" | "This Week" | "Weekend" | "Custom";

export type ScrimFormat = "BO1" | "BO2" | "BO3" | "BO5" | "Scrim Block";

export const TIME_WINDOWS: TimeWindow[] = [
  "Tonight",
  "This Week",
  "Weekend",
  "Custom",
];

export const SCRIM_FORMATS: ScrimFormat[] = [
  "BO1",
  "BO2",
  "BO3",
  "BO5",
  "Scrim Block",
];

/**
 * The viewer's relationship to a listing's Request Scrim control, computed
 * server-side (listScrimsForGame) — never trust a client-only eligibility
 * check for a write:
 * - "anon": not signed in.
 * - "no-team": signed in, but doesn't handle a team in this listing's game.
 * - "own-team": handles the team that posted this listing.
 * - "requested": that team already has a live (non-cancelled) request on it.
 * - "can-request": eligible to send one.
 */
export type RequestState =
  | "anon"
  | "no-team"
  | "own-team"
  | "requested"
  | "can-request";

export interface ScrimListing {
  id: string;
  game: GameId;
  /** The posting team's id — needed to tell "own-team" apart from a request target. */
  teamId: string;
  teamName: string;
  school: string;
  verified: boolean;
  /** Native TAMBAYAN rating for this team in this game. Range ~1400–2100. */
  rating: number;
  /** Reliability score as a percentage. Range 70–99. */
  reliability: number;
  /** Human-readable availability window, e.g. "Tonight 8:00–11:00 PM". */
  availability: string;
  /** Bucket the availability falls in — drives the Time Window filter. */
  timeWindow: Exclude<TimeWindow, "Custom">;
  format: ScrimFormat;
  /** Display string for the rank spread, e.g. "Mythic–Mythical Glory". */
  rankBand: string;
  /** Tiers this listing spans, matched against the Rank Band filter value. */
  rankTiers: string[];
  requestState: RequestState;
}

/** Shared server-action result shape — mirrors teams/matches' own ActionResult. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** A pending scrim_requests row addressed to one of the viewer's handled teams. */
export interface IncomingScrimRequest {
  id: string;
  listingId: string;
  toTeamId: string;
  message: string | null;
  createdAt: string;
  game: GameId;
  windowLabel: string | null;
  format: ScrimFormat;
  fromTeamName: string;
  fromTeamTag: string | null;
  fromSchool: string | null;
}
