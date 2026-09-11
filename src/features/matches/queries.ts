import { createClient } from "@/lib/supabase/server";
import { coerceGameId } from "@/features/games/config";
import type { MatchRow, MatchView, MatchGroups, TeamLite, ViewerSide } from "./types";
import { groupOf } from "./types";

/**
 * Server-only reads for the Match Room. `scrim_matches` is public SELECT, so
 * these run for signed-out viewers too — mutation gating lives in actions.ts.
 */

interface TeamJoinRow {
  id: string;
  name: string;
  tag: string | null;
  handler_id: string | null;
  schools: { name: string; short_name: string | null } | null;
  handler: { handle: string | null } | null;
}

function toTeamLite(row: TeamJoinRow | undefined, id: string): TeamLite {
  if (!row) {
    return { id, name: "Unknown team", tag: null, schoolName: null, handlerId: null, handlerHandle: null };
  }
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    schoolName: row.schools?.short_name ?? row.schools?.name ?? null,
    handlerId: row.handler_id,
    handlerHandle: row.handler?.handle ?? null,
  };
}

async function fetchTeams(ids: string[]): Promise<Map<string, TeamJoinRow>> {
  const map = new Map<string, TeamJoinRow>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select(
      "id, name, tag, handler_id, schools ( name, short_name ), handler:profiles!teams_handler_id_fkey ( handle )",
    )
    .in("id", unique)
    .returns<TeamJoinRow[]>();
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

function toView(match: MatchRow, teams: Map<string, TeamJoinRow>): MatchView {
  return {
    match,
    game: coerceGameId(match.game_id),
    teamA: toTeamLite(teams.get(match.team_a), match.team_a),
    teamB: toTeamLite(teams.get(match.team_b), match.team_b),
  };
}

/** Team ids the profile can act on: rostered (team_members) + handled (teams.handler_id). */
export async function getMyTeamIds(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const [members, handled] = await Promise.all([
    supabase.from("team_members").select("team_id").eq("profile_id", profileId),
    supabase.from("teams").select("id").eq("handler_id", profileId),
  ]);
  const ids = new Set<string>();
  for (const r of members.data ?? []) ids.add(r.team_id);
  for (const r of handled.data ?? []) ids.add(r.id);
  return [...ids];
}

/**
 * Team ids the profile is the HANDLER of — narrower than getMyTeamIds, which
 * also includes teams they merely roster on. Incoming scrim requests can only
 * be accepted/declined by a handler (scrim_requests_update_party RLS), so
 * that section needs this set, not the mixed one.
 */
export async function getHandledTeamIds(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("id").eq("handler_id", profileId);
  return (data ?? []).map((r) => r.id);
}

export interface MatchesForProfile {
  groups: MatchGroups;
  total: number;
  hasTeams: boolean;
  /** The profile's team ids — [] when they're on no team. */
  teamIds: string[];
}

/**
 * Matches involving the profile's teams, grouped. When the profile is on no
 * team, returns every demo match read-only (`hasTeams: false`).
 */
export async function getMatchesForProfile(profileId: string): Promise<MatchesForProfile> {
  const supabase = await createClient();
  const teamIds = await getMyTeamIds(profileId);
  const hasTeams = teamIds.length > 0;

  let query = supabase
    .from("scrim_matches")
    .select("*")
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (hasTeams) {
    const list = teamIds.join(",");
    query = query.or(`team_a.in.(${list}),team_b.in.(${list})`);
  }

  const { data: matches } = await query;
  const rows = (matches ?? []) as MatchRow[];

  const teams = await fetchTeams(rows.flatMap((m) => [m.team_a, m.team_b]));

  const groups: MatchGroups = { upcoming: [], awaiting: [], history: [] };
  for (const m of rows) groups[groupOf(m.status)].push(toView(m, teams));

  return { groups, total: rows.length, hasTeams, teamIds };
}

export interface MatchRoomData {
  view: MatchView;
  viewerSide: ViewerSide;
}

/** One match + the viewer's handler relationship to it. `null` when not found. */
export async function getMatchRoom(
  matchId: string,
  viewerId: string | null,
): Promise<MatchRoomData | null> {
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("scrim_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return null;

  const teams = await fetchTeams([match.team_a, match.team_b]);
  const view = toView(match as MatchRow, teams);

  let viewerSide: ViewerSide = null;
  if (viewerId) {
    const handlesA = view.teamA.handlerId === viewerId;
    const handlesB = view.teamB.handlerId === viewerId;
    if (handlesA && handlesB) viewerSide = "both";
    else if (handlesA) viewerSide = "a";
    else if (handlesB) viewerSide = "b";
  }

  return { view, viewerSide };
}
