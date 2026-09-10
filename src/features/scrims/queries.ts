import { createClient } from "@/lib/supabase/server";
import { coerceGameId, type GameId } from "@/features/games/config";
import type { ScrimFormat, ScrimListing, TimeWindow } from "./types";

/** First element of a Supabase nested relation, or null. */
function one<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Bucket a free-text availability label into the Time Window filter values. */
function toTimeWindow(label: string | null): Exclude<TimeWindow, "Custom"> {
  const s = (label ?? "").toLowerCase();
  if (s.includes("tonight")) return "Tonight";
  if (s.includes("weekend") || s.includes("sat") || s.includes("sun")) {
    return "Weekend";
  }
  return "This Week";
}

const KNOWN_FORMATS: ScrimFormat[] = ["BO1", "BO2", "BO3", "BO5", "Scrim Block"];

/** Map the DB `format` enum to the display union used by the card + filter. */
function toFormat(raw: string): ScrimFormat {
  if (raw === "SCRIM_BLOCK") return "Scrim Block";
  return (KNOWN_FORMATS as string[]).includes(raw)
    ? (raw as ScrimFormat)
    : "Scrim Block";
}

/**
 * Open scrim listings for a game, shaped for the Scrim Finder feed.
 *
 * `scrim_listings` embeds its `teams` → `schools`; ratings and reliability are
 * game/team-scoped side tables, pulled in two `.in(team_id, …)` lookups and
 * merged by id. All four tables are public SELECT (RLS `using(true)`).
 */
export async function listScrimsForGame(game: GameId): Promise<ScrimListing[]> {
  // Reachable by signed-out visitors via the landing page's live-board preview
  // link, so a Supabase config/outage issue must degrade to an empty feed —
  // not crash the page — same as any other query failure below.
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("listScrimsForGame: Supabase client unavailable —", err);
    return [];
  }

  const { data, error } = await supabase
    .from("scrim_listings")
    .select(
      "id,game_id,format,window_label,rank_band_label,rank_min,rank_max,team_id,teams(name,tag,region,school_id,schools(name,short_name))",
    )
    .eq("game_id", game)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const teamIds = [...new Set(data.map((r) => r.team_id).filter(Boolean))];

  const ratingByTeam = new Map<string, number>();
  const reliabilityByTeam = new Map<string, number>();

  if (teamIds.length > 0) {
    const [{ data: ratingRows }, { data: relRows }] = await Promise.all([
      supabase
        .from("ratings")
        .select("team_id,rating")
        .eq("game_id", game)
        .in("team_id", teamIds),
      supabase
        .from("reliability_scores")
        .select("team_id,score")
        .in("team_id", teamIds),
    ]);

    for (const r of ratingRows ?? []) {
      if (r.team_id) ratingByTeam.set(r.team_id, r.rating);
    }
    for (const r of relRows ?? []) {
      if (r.team_id) reliabilityByTeam.set(r.team_id, r.score);
    }
  }

  return data.map((row): ScrimListing => {
    const team = one(row.teams);
    const school = one(team?.schools);
    const rankTiers = [row.rank_min, row.rank_max].filter(
      (t): t is string => Boolean(t),
    );

    return {
      id: row.id,
      game: coerceGameId(row.game_id),
      teamName: team?.name ?? "Unknown team",
      school: school?.name ?? "Independent",
      verified: team?.school_id != null,
      rating: Math.round(ratingByTeam.get(row.team_id) ?? 1500),
      reliability: Math.round(reliabilityByTeam.get(row.team_id) ?? 100),
      availability: row.window_label ?? "Flexible",
      timeWindow: toTimeWindow(row.window_label),
      format: toFormat(row.format),
      rankBand:
        row.rank_band_label ??
        `${row.rank_min ?? "Any"}–${row.rank_max ?? "Any"}`,
      rankTiers,
    };
  });
}
