import type { Tables } from "@/lib/db/types";
import type { GameId } from "@/features/games/config";

/**
 * Match Room domain types + pure helpers. No IO here — safe to import from
 * Server Components, Client Components, and server actions.
 */

export type MatchRow = Tables<"scrim_matches">;

export type MatchStatus =
  | "booked"
  | "reported"
  | "confirmed"
  | "disputed"
  | "cancelled";

/** A team as shown in the Match Room — the subset we ever need. */
export interface TeamLite {
  id: string;
  name: string;
  tag: string | null;
  schoolName: string | null;
  handlerId: string | null;
  handlerHandle: string | null;
}

export interface MatchView {
  match: MatchRow;
  game: GameId;
  teamA: TeamLite;
  teamB: TeamLite;
}

/** Which side of a match the viewer handles, if any. */
export type ViewerSide = "a" | "b" | "both" | null;

export type MatchGroupKey = "upcoming" | "awaiting" | "history";

export interface MatchGroups {
  upcoming: MatchView[];
  awaiting: MatchView[];
  history: MatchView[];
}

export const GROUP_LABEL: Record<MatchGroupKey, string> = {
  upcoming: "Upcoming",
  awaiting: "Awaiting confirmation",
  history: "History",
};

/** booked -> upcoming · reported/disputed -> awaiting · confirmed/cancelled -> history */
export function groupOf(status: string): MatchGroupKey {
  if (status === "booked") return "upcoming";
  if (status === "reported" || status === "disputed") return "awaiting";
  return "history";
}

export const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  reported: "Reported",
  confirmed: "Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

/* -------------------------------------------------------------------------- */
/* Ruleset                                                                     */
/* -------------------------------------------------------------------------- */

export interface Ruleset {
  mode: string;
  maps: string[];
  series: string;
  server: string;
}

export const SERIES_OPTIONS = ["BO1", "BO2", "BO3", "BO5", "Scrim Block"] as const;

const EMPTY_RULESET: Ruleset = { mode: "", maps: [], series: "", server: "" };

/** Coerce the DB `ruleset` jsonb (unknown shape) into a stable Ruleset. */
export function parseRuleset(json: unknown): Ruleset {
  if (json == null || typeof json !== "object" || Array.isArray(json)) {
    return { ...EMPTY_RULESET };
  }
  const r = json as Record<string, unknown>;
  const maps = Array.isArray(r.maps)
    ? r.maps.filter((m): m is string => typeof m === "string")
    : [];
  return {
    mode: typeof r.mode === "string" ? r.mode : "",
    maps,
    series: typeof r.series === "string" ? r.series : "",
    server: typeof r.server === "string" ? r.server : "",
  };
}

/** Ordered key/value rows for the locked spec table. */
export function rulesetRows(r: Ruleset): { key: string; value: string }[] {
  return [
    { key: "Mode", value: r.mode || "—" },
    { key: "Maps", value: r.maps.length ? r.maps.join(", ") : "—" },
    { key: "Series", value: r.series || "—" },
    { key: "Server", value: r.server || "—" },
  ];
}

/** "Dota 2", "Ascent, Haven" — comma list -> trimmed, de-duped array. */
export function mapsFromCommaList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Result helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Winner team id from a score line. `null` on a tie (no winner). */
export function computeWinner(
  teamAId: string,
  teamBId: string,
  scoreA: number,
  scoreB: number,
): string | null {
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? teamAId : teamBId;
}

/* -------------------------------------------------------------------------- */
/* Time                                                                        */
/* -------------------------------------------------------------------------- */

/** Rough match length used only to flip the countdown to LIVE / Ended. */
export function estimatedDurationMs(format: string): number {
  const f = format.toUpperCase();
  if (f === "BO1") return 35 * 60_000;
  if (f === "BO2") return 70 * 60_000;
  if (f === "BO3") return 100 * 60_000;
  if (f === "BO5") return 160 * 60_000;
  return 120 * 60_000; // Scrim Block / unknown
}

/** "in 2h 5m" / "5m ago" / "just now" — deterministic, no locale surprises. */
export function relativeTime(fromISO: string | null, now: number = Date.now()): string {
  if (!fromISO) return "TBD";
  const t = new Date(fromISO).getTime();
  if (Number.isNaN(t)) return "TBD";
  const diff = t - now;
  const past = diff < 0;
  const s = Math.round(Math.abs(diff) / 1000);
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  let body: string;
  if (s < 45) body = "just now";
  else if (m < 60) body = `${m}m`;
  else if (h < 24) body = `${h}h`;
  else body = `${d}d`;
  if (body === "just now") return body;
  return past ? `${body} ago` : `in ${body}`;
}

/** Absolute stamp, PH time, e.g. "Sat, Sep 6, 8:00 PM". */
export function absoluteTime(fromISO: string | null): string {
  if (!fromISO) return "Not scheduled";
  const d = new Date(fromISO);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}
