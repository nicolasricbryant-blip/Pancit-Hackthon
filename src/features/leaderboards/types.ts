/**
 * Leaderboards — shared view-model types and searchParam coercion helpers.
 *
 * This module is import-safe from both server and client components (no
 * `next/headers`, no Supabase). The board is public read-only.
 */

/** Which entity the board ranks. URL param `?board=`. */
export type BoardKind = "team" | "player";

/** Sort axis — a product pillar: skill (rating) vs. community (standing). URL param `?sort=`. */
export type SortKey = "rating" | "standing";

/**
 * Top-level reach of the board. URL param `?scope=`.
 * - `nationwide` — every team/player in the game (default)
 * - `regional` — narrowed to a region (explicit `?region=` or the viewer's own)
 * - `school` — narrowed to the signed-in viewer's school
 */
export type ScopeKind = "nationwide" | "regional" | "school";

type Param = string | string[] | undefined;

function first(v: Param): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function coerceBoard(v: Param): BoardKind {
  return first(v) === "player" ? "player" : "team";
}

export function coerceSort(v: Param): SortKey {
  return first(v) === "standing" ? "standing" : "rating";
}

export function coerceScope(v: Param): ScopeKind {
  const raw = first(v);
  return raw === "regional" || raw === "school" ? raw : "nationwide";
}

/** Plain string searchParam (region / school id), empty string = unset. */
export function coerceStr(v: Param): string {
  const raw = first(v);
  return typeof raw === "string" ? raw : "";
}

/** One row of the team board. */
export interface TeamRow {
  teamId: string;
  name: string;
  tag: string | null;
  schoolShort: string | null;
  region: string | null;
  rating: number;
  wins: number;
  losses: number;
  /** reliability_scores.score, already a 0–100 percentage. `null` if unscored. */
  reliability: number | null;
  /** community_standing.points. `null` if the team has no standing row. */
  standing: number | null;
}

/** One row of the player board. */
export interface PlayerRow {
  profileId: string;
  displayName: string;
  handle: string | null;
  schoolShort: string | null;
  region: string | null;
  /** game_profiles.rank_label for this game. */
  rankLabel: string | null;
  /** game_profiles.verification_status === "verified". */
  verified: boolean;
  rating: number;
  standing: number | null;
}

/** `<select>` option for the school combobox. */
export interface FilterOption {
  value: string;
  label: string;
}

/** Region + school + sort narrowing passed to the query layer. */
export interface BoardFilters {
  region: string;
  school: string;
  sort: SortKey;
}
