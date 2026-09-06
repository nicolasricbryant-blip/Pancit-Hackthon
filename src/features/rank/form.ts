import type { Json } from "@/lib/db/types";

/**
 * Pure helpers for the per-game rank-submission form. No React, no server
 * imports — safe to pull into a Client Component or a Server Action.
 *
 * `form_fields` and `rank_tiers` are stored on the `games` row as loose JSON,
 * so everything here is defensively coerced.
 */

export type RankFieldType = "select" | "number" | "text";

export interface RankFormField {
  key: string;
  label: string;
  type: RankFieldType;
}

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

/** A field's submitted value — only strings and numbers ever land in `claimed_rank`. */
export type RankValue = string | number;
export type RankValues = Record<string, RankValue>;

/** Narrow the DB `verification_status` string to the known union. */
export function coerceVerificationStatus(
  raw: string | null | undefined,
): VerificationStatus {
  return raw === "pending" || raw === "verified" || raw === "rejected"
    ? raw
    : "unverified";
}

/** Parse `games.form_fields` (loose JSON) into a typed field list. */
export function coerceFormFields(json: Json | null | undefined): RankFormField[] {
  if (!Array.isArray(json)) return [];
  const out: RankFormField[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const key = typeof rec.key === "string" ? rec.key : null;
    const label = typeof rec.label === "string" ? rec.label : null;
    const type =
      rec.type === "select" || rec.type === "number" || rec.type === "text"
        ? rec.type
        : null;
    if (key && label && type) out.push({ key, label, type });
  }
  return out;
}

/** Parse `games.rank_tiers` (loose JSON) into an ordered string list. */
export function coerceStringArray(json: Json | null | undefined): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((v): v is string => typeof v === "string");
}

/**
 * Options for a select field. A select whose key looks like a tier/rank uses
 * the game's `rank_tiers`; any other select has no options and the form falls
 * back to a free-text input.
 */
export function selectOptions(
  field: RankFormField,
  rankTiers: string[],
): string[] | null {
  if (field.type !== "select") return null;
  return /tier|rank/i.test(field.key) ? rankTiers : null;
}

/** True when a field renders as a plain text input (text type, or optionless select). */
export function isTextLike(field: RankFormField, rankTiers: string[]): boolean {
  if (field.type === "text") return true;
  return field.type === "select" && selectOptions(field, rankTiers) === null;
}

/**
 * Compose a human-readable rank label from the submitted values, e.g.
 * "Mythical Glory · 45 Stars", "Immortal · 120 Rank Rating (RR)", "5240 MMR".
 * Text/select values lead; number values are suffixed with their label.
 */
export function composeRankLabel(
  fields: RankFormField[],
  values: RankValues,
): string {
  const seg: string[] = [];
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined || v === "" || v === null) continue;
    seg.push(f.type === "number" ? `${v} ${f.label}` : String(v));
  }
  return seg.join(" · ") || "Unranked";
}

/** Render `claimed_rank` JSON as ordered [label, value] pairs for review chips. */
export function claimedRankEntries(json: Json | null | undefined): [string, string][] {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return [];
  const rec = json as Record<string, unknown>;
  return Object.entries(rec)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k, String(v)]);
}
