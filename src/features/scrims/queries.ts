import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/features/auth/session";
import { coerceGameId, type GameId } from "@/features/games/config";
import type {
  IncomingScrimRequest,
  RequestState,
  ScrimFormat,
  ScrimListing,
  TimeWindow,
} from "./types";

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
 *
 * Also resolves the viewer's Request Scrim eligibility (`requestState`) per
 * listing — two more lookups (the team they handle in this game, and that
 * team's existing scrim_requests), not one query per card.
 */
export async function listScrimsForGame(game: GameId): Promise<ScrimListing[]> {
  const supabase = await createClient();

  const [{ data, error }, user] = await Promise.all([
    supabase
      .from("scrim_listings")
      .select(
        "id,game_id,format,window_label,rank_band_label,rank_min,rank_max,team_id,teams(name,tag,region,school_id,schools(name,short_name))",
      )
      .eq("game_id", game)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    getUser(),
  ]);

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

  // The team (if any) the viewer handles in THIS game, and the listings that
  // team has already sent a live (non-cancelled) request on. A cancelled
  // request still holds the (listing_id, from_team) unique slot — see the
  // migration — so it can't be re-requested either, but that's a follow-up
  // concern for whoever builds a "cancel and re-request" flow; the honest
  // error from requestScrim() covers it in the meantime.
  let handledTeamId: string | null = null;
  const requestedListingIds = new Set<string>();
  if (user) {
    const { data: handled } = await supabase
      .from("teams")
      .select("id")
      .eq("game_id", game)
      .eq("handler_id", user.id)
      .limit(1);
    handledTeamId = handled?.[0]?.id ?? null;

    if (handledTeamId) {
      const { data: existing } = await supabase
        .from("scrim_requests")
        .select("listing_id")
        .eq("from_team", handledTeamId)
        .neq("status", "cancelled");
      for (const r of existing ?? []) requestedListingIds.add(r.listing_id);
    }
  }

  function requestStateFor(listingId: string, listingTeamId: string): RequestState {
    if (!user) return "anon";
    if (!handledTeamId) return "no-team";
    if (listingTeamId === handledTeamId) return "own-team";
    if (requestedListingIds.has(listingId)) return "requested";
    return "can-request";
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
      teamId: row.team_id,
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
      requestState: requestStateFor(row.id, row.team_id),
    };
  });
}

interface SchoolLite {
  name: string;
  short_name: string | null;
}
interface FromTeamJoin {
  name: string;
  tag: string | null;
  school_id: string | null;
  schools: SchoolLite | SchoolLite[] | null;
}
interface ListingJoin {
  game_id: string;
  window_label: string | null;
  format: string;
}
interface IncomingRequestRow {
  id: string;
  listing_id: string;
  to_team: string;
  message: string | null;
  created_at: string;
  listing: ListingJoin | ListingJoin[] | null;
  fromTeam: FromTeamJoin | FromTeamJoin[] | null;
}

/**
 * Pending scrim_requests addressed to any of the caller's HANDLED teams (not
 * merely rostered — only a handler can accept/decline, per RLS). Powers the
 * "Incoming scrim requests" section on /matches.
 */
export async function listIncomingScrimRequests(
  handledTeamIds: string[],
): Promise<IncomingScrimRequest[]> {
  if (handledTeamIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrim_requests")
    .select(
      "id,listing_id,to_team,message,created_at,listing:scrim_listings(game_id,window_label,format),fromTeam:teams!scrim_requests_from_team_fkey(name,tag,school_id,schools(name,short_name))",
    )
    .in("to_team", handledTeamIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<IncomingRequestRow[]>();

  if (error || !data) return [];

  return data.map((row): IncomingScrimRequest => {
    const listing = one(row.listing);
    const team = one(row.fromTeam);
    const school = one(team?.schools);

    return {
      id: row.id,
      listingId: row.listing_id,
      toTeamId: row.to_team,
      message: row.message,
      createdAt: row.created_at,
      game: coerceGameId(listing?.game_id ?? "mlbb"),
      windowLabel: listing?.window_label ?? null,
      format: toFormat(listing?.format ?? "BO3"),
      fromTeamName: team?.name ?? "Unknown team",
      fromTeamTag: team?.tag ?? null,
      fromSchool: school?.short_name ?? school?.name ?? null,
    };
  });
}
