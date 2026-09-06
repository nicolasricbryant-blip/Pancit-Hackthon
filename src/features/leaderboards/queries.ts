/**
 * Leaderboards — server query layer. Public read-only; no auth required.
 *
 * The dataset is tiny (tens of rows per game), so each board runs a small set
 * of flat, fully-typed selects and stitches + sorts + filters in JS rather than
 * leaning on nested PostgREST embeds. Region/school filters are applied here.
 */

import { createClient } from "@/lib/supabase/server";
import type { GameId } from "@/features/games/config";
import type {
  BoardFilters,
  BoardKind,
  FilterOption,
  PlayerRow,
  TeamRow,
} from "./types";

function sortRows<T extends { rating: number; standing: number | null }>(
  rows: T[],
  sort: BoardFilters["sort"],
): T[] {
  return [...rows].sort((a, b) =>
    sort === "standing"
      ? (b.standing ?? Number.NEGATIVE_INFINITY) -
        (a.standing ?? Number.NEGATIVE_INFINITY)
      : b.rating - a.rating,
  );
}

function dedupeSorted(values: (string | null)[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => typeof v === "string" && v !== "")),
  ).sort((a, b) => a.localeCompare(b));
}

/** Team board: ratings (team rows for this game) ⋈ teams ⋈ schools ⋈ reliability ⋈ standing. */
export async function getTeamRows(
  game: GameId,
  filters: BoardFilters,
): Promise<TeamRow[]> {
  const supabase = await createClient();

  const { data: ratings, error } = await supabase
    .from("ratings")
    .select("team_id, rating, wins, losses")
    .eq("game_id", game)
    .not("team_id", "is", null);
  if (error) throw error;

  const teamIds = (ratings ?? [])
    .map((r) => r.team_id)
    .filter((v): v is string => v != null);
  if (teamIds.length === 0) return [];

  const [teamsRes, relRes, standRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, tag, region, school_id")
      .in("id", teamIds),
    supabase
      .from("reliability_scores")
      .select("team_id, score")
      .in("team_id", teamIds),
    supabase
      .from("community_standing")
      .select("team_id, points")
      .in("team_id", teamIds),
  ]);
  if (teamsRes.error) throw teamsRes.error;
  if (relRes.error) throw relRes.error;
  if (standRes.error) throw standRes.error;

  const schoolIds = (teamsRes.data ?? [])
    .map((t) => t.school_id)
    .filter((v): v is string => v != null);
  const schoolsRes = await supabase
    .from("schools")
    .select("id, short_name")
    .in("id", schoolIds);
  if (schoolsRes.error) throw schoolsRes.error;

  const teamById = new Map(
    (teamsRes.data ?? []).map((t) => [t.id, t] as const),
  );
  const relByTeam = new Map(
    (relRes.data ?? []).map((r) => [r.team_id, r.score] as const),
  );
  const standByTeam = new Map(
    (standRes.data ?? []).map((s) => [s.team_id, s.points] as const),
  );
  const shortById = new Map(
    (schoolsRes.data ?? []).map((s) => [s.id, s.short_name] as const),
  );

  let rows: TeamRow[] = (ratings ?? []).flatMap((r) => {
    if (r.team_id == null) return [];
    const team = teamById.get(r.team_id);
    if (!team) return [];
    return [
      {
        teamId: team.id,
        name: team.name,
        tag: team.tag,
        schoolShort: team.school_id
          ? shortById.get(team.school_id) ?? null
          : null,
        region: team.region,
        rating: r.rating,
        wins: r.wins,
        losses: r.losses,
        reliability: relByTeam.get(r.team_id) ?? null,
        standing: standByTeam.get(r.team_id) ?? null,
      },
    ];
  });

  if (filters.region) {
    rows = rows.filter((row) => row.region === filters.region);
  }
  if (filters.school) {
    rows = rows.filter(
      (row) => teamById.get(row.teamId)?.school_id === filters.school,
    );
  }

  return sortRows(rows, filters.sort);
}

/** Player board: ratings (profile rows for this game) ⋈ profiles ⋈ schools ⋈ game_profiles ⋈ standing. */
export async function getPlayerRows(
  game: GameId,
  filters: BoardFilters,
): Promise<PlayerRow[]> {
  const supabase = await createClient();

  const { data: ratings, error } = await supabase
    .from("ratings")
    .select("profile_id, rating")
    .eq("game_id", game)
    .not("profile_id", "is", null);
  if (error) throw error;

  const profileIds = (ratings ?? [])
    .map((r) => r.profile_id)
    .filter((v): v is string => v != null);
  if (profileIds.length === 0) return [];

  const [profRes, gpRes, standRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, handle, region, school_id")
      .in("id", profileIds),
    supabase
      .from("game_profiles")
      .select("profile_id, rank_label, verification_status")
      .eq("game_id", game)
      .in("profile_id", profileIds),
    supabase
      .from("community_standing")
      .select("profile_id, points")
      .in("profile_id", profileIds),
  ]);
  if (profRes.error) throw profRes.error;
  if (gpRes.error) throw gpRes.error;
  if (standRes.error) throw standRes.error;

  const schoolIds = (profRes.data ?? [])
    .map((p) => p.school_id)
    .filter((v): v is string => v != null);
  const schoolsRes = await supabase
    .from("schools")
    .select("id, short_name")
    .in("id", schoolIds);
  if (schoolsRes.error) throw schoolsRes.error;

  const profById = new Map(
    (profRes.data ?? []).map((p) => [p.id, p] as const),
  );
  const gpByProfile = new Map(
    (gpRes.data ?? []).map((g) => [g.profile_id, g] as const),
  );
  const standByProfile = new Map(
    (standRes.data ?? []).map((s) => [s.profile_id, s.points] as const),
  );
  const shortById = new Map(
    (schoolsRes.data ?? []).map((s) => [s.id, s.short_name] as const),
  );

  let rows: PlayerRow[] = (ratings ?? []).flatMap((r) => {
    if (r.profile_id == null) return [];
    const profile = profById.get(r.profile_id);
    if (!profile) return [];
    const gp = gpByProfile.get(r.profile_id);
    return [
      {
        profileId: profile.id,
        displayName: profile.display_name ?? "Unknown player",
        handle: profile.handle,
        schoolShort: profile.school_id
          ? shortById.get(profile.school_id) ?? null
          : null,
        region: profile.region,
        rankLabel: gp?.rank_label ?? null,
        verified: gp?.verification_status === "verified",
        rating: r.rating,
        standing: standByProfile.get(r.profile_id) ?? null,
      },
    ];
  });

  if (filters.region) {
    rows = rows.filter((row) => row.region === filters.region);
  }
  if (filters.school) {
    rows = rows.filter(
      (row) => profById.get(row.profileId)?.school_id === filters.school,
    );
  }

  return sortRows(rows, filters.sort);
}

/** Distinct region values — from teams (scoped to this game) or profiles. */
export async function getRegions(
  board: BoardKind,
  game: GameId,
): Promise<string[]> {
  const supabase = await createClient();

  if (board === "player") {
    const { data, error } = await supabase
      .from("profiles")
      .select("region")
      .not("region", "is", null);
    if (error) throw error;
    return dedupeSorted((data ?? []).map((r) => r.region));
  }

  const { data, error } = await supabase
    .from("teams")
    .select("region")
    .eq("game_id", game)
    .not("region", "is", null);
  if (error) throw error;
  return dedupeSorted((data ?? []).map((r) => r.region));
}

/** All schools as combobox options, labelled by short_name, ordered A→Z. */
export async function getSchools(): Promise<FilterOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, short_name, name")
    .order("short_name", { nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    value: s.id,
    label: s.short_name ?? s.name,
  }));
}
