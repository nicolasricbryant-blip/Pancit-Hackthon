import { createClient } from "@/lib/supabase/server";
import { coerceGameId, type GameId } from "@/features/games/config";
import {
  isRosterRole,
  type RosterMember,
  type SchoolLite,
  type TeamListItem,
  type TeamProfile,
} from "./types";

/** First element of a Supabase nested relation, or null. */
function one<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** All teams in a game, with their rating / reliability / standing stats. */
export async function listTeamsForGame(game: GameId): Promise<TeamListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,name,tag,region,game_id,schools(name,short_name),ratings(rating),reliability_scores(score),community_standing(points)",
    )
    .eq("game_id", game)
    .order("name");

  if (error || !data) return [];

  return data.map((t): TeamListItem => {
    const rating = one(t.ratings);
    const rel = one(t.reliability_scores);
    const cs = one(t.community_standing);
    const school = one(t.schools);
    return {
      id: t.id,
      name: t.name,
      tag: t.tag,
      region: t.region,
      game_id: coerceGameId(t.game_id),
      school: school ? { name: school.name, short_name: school.short_name } : null,
      rating: rating?.rating ?? 1500,
      reliability: rel?.score ?? 100,
      standing: cs?.points ?? 0,
    };
  });
}

/** Distinct, sorted region labels across a set of teams. */
export function regionsOf(teams: TeamListItem[]): string[] {
  const set = new Set<string>();
  for (const t of teams) if (t.region) set.add(t.region);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Schools represented by a set of teams (for the browse filter). */
export function schoolsOf(teams: TeamListItem[]): { name: string; short_name: string | null }[] {
  const map = new Map<string, { name: string; short_name: string | null }>();
  for (const t of teams) {
    if (t.school) map.set(t.school.name, t.school);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Full team profile + roster. Null when the id doesn't exist. */
export async function getTeamProfile(teamId: string): Promise<TeamProfile | null> {
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id,name,tag,bio,region,game_id,handler_id,schools(id,name,short_name),ratings(rating,wins,losses,matches_played),reliability_scores(score),community_standing(points,events_attended,events_hosted)",
    )
    .eq("id", teamId)
    .maybeSingle();

  if (error || !team) return null;

  const { data: memberRows } = await supabase
    .from("team_members")
    .select("id,role,jersey_name,profile_id,profiles(display_name,handle)")
    .eq("team_id", teamId)
    .order("joined_at");

  const rating = one(team.ratings);
  const rel = one(team.reliability_scores);
  const cs = one(team.community_standing);
  const school = one(team.schools);

  const roster: RosterMember[] = (memberRows ?? []).map((m): RosterMember => {
    const p = one(m.profiles);
    return {
      id: m.id,
      profileId: m.profile_id,
      role: isRosterRole(m.role) ? m.role : "starter",
      jerseyName: m.jersey_name,
      displayName: p?.display_name ?? null,
      handle: p?.handle ?? null,
    };
  });

  return {
    id: team.id,
    name: team.name,
    tag: team.tag,
    bio: team.bio,
    region: team.region,
    game_id: coerceGameId(team.game_id),
    handlerId: team.handler_id,
    school: school
      ? { id: school.id, name: school.name, short_name: school.short_name }
      : null,
    competitive: {
      rating: rating?.rating ?? 1500,
      wins: rating?.wins ?? 0,
      losses: rating?.losses ?? 0,
      matchesPlayed: rating?.matches_played ?? 0,
      reliability: rel?.score ?? 100,
    },
    community: {
      points: cs?.points ?? 0,
      eventsAttended: cs?.events_attended ?? 0,
      eventsHosted: cs?.events_hosted ?? 0,
    },
    roster,
  };
}

/** Every school, for the create/manage pickers. */
export async function listSchools(): Promise<SchoolLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id,name,short_name,region")
    .order("name");
  return data ?? [];
}
