import { createClient } from "@/lib/supabase/server";
import { coerceGameId, type GameId } from "@/features/games/config";
import {
  roundsForSize,
  type BracketNode,
  type EntrantView,
  type TeamLite,
  type TournamentDetail,
  type TournamentListItem,
} from "./types";

/** id → { name, tag } for a set of team ids. */
async function fetchTeams(
  ids: (string | null | undefined)[],
): Promise<Map<string, TeamLite>> {
  const map = new Map<string, TeamLite>();
  const unique = [...new Set(ids)].filter((x): x is string => !!x);
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id,name,tag")
    .in("id", unique);
  for (const r of data ?? []) {
    map.set(r.id, { id: r.id, name: r.name, tag: r.tag });
  }
  return map;
}

interface TeamMeta {
  name: string;
  tag: string | null;
  rating: number;
}

/**
 * id → { name, tag, rating }. Rating is the team's rating IN THIS GAME (a team
 * entered into a bracket for a game it has no rating in shows the 1500 default —
 * never its rating from some other title).
 */
async function fetchTeamMeta(
  ids: string[],
  gameId: string,
): Promise<Map<string, TeamMeta>> {
  const map = new Map<string, TeamMeta>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id,name,tag,ratings(rating,game_id)")
    .in("id", unique);
  for (const r of data ?? []) {
    const rows = Array.isArray(r.ratings) ? r.ratings : r.ratings ? [r.ratings] : [];
    const forGame = rows.find((x) => x.game_id === gameId);
    map.set(r.id, { name: r.name, tag: r.tag, rating: forGame?.rating ?? 1500 });
  }
  return map;
}

/** All tournaments in a game, newest first, with entrant counts + champion names. */
export async function listTournamentsForGame(
  game: GameId,
): Promise<TournamentListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,slug,name,size,scope,region,status,starts_at,champion_team_id")
    .eq("game_id", game)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const ids = data.map((t) => t.id);
  const countByTournament = new Map<string, number>();
  if (ids.length > 0) {
    const { data: ents } = await supabase
      .from("tournament_entrants")
      .select("tournament_id")
      .in("tournament_id", ids);
    for (const e of ents ?? []) {
      countByTournament.set(
        e.tournament_id,
        (countByTournament.get(e.tournament_id) ?? 0) + 1,
      );
    }
  }

  const champIds = data
    .map((t) => t.champion_team_id)
    .filter((x): x is string => !!x);
  const champById = await fetchTeams(champIds);

  return data.map((t): TournamentListItem => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    size: t.size,
    scope: t.scope,
    region: t.region,
    status: t.status,
    startsAt: t.starts_at,
    entrantCount: countByTournament.get(t.id) ?? 0,
    champion: t.champion_team_id
      ? champById.get(t.champion_team_id) ?? null
      : null,
  }));
}

/** Full tournament bundle by slug. Null when the slug doesn't exist. */
export async function getTournamentBySlug(
  slug: string,
): Promise<TournamentDetail | null> {
  const supabase = await createClient();

  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!t) return null;

  const gameId = coerceGameId(t.game_id);
  const rounds = roundsForSize(t.size);

  let hostHandle: string | null = null;
  if (t.host_profile_id) {
    const { data: host } = await supabase
      .from("profiles")
      .select("handle,display_name")
      .eq("id", t.host_profile_id)
      .maybeSingle();
    hostHandle = host?.handle ?? host?.display_name ?? null;
  }

  const { data: entRows } = await supabase
    .from("tournament_entrants")
    .select("id,team_id,seed,registered_by")
    .eq("tournament_id", t.id);

  const teamMetaById = await fetchTeamMeta(
    (entRows ?? []).map((e) => e.team_id),
    gameId,
  );

  const entrants: EntrantView[] = (entRows ?? []).map((e): EntrantView => {
    const m = teamMetaById.get(e.team_id);
    return {
      id: e.id,
      teamId: e.team_id,
      seed: e.seed,
      name: m?.name ?? "Unknown team",
      tag: m?.tag ?? null,
      rating: m?.rating ?? 1500,
      registeredBy: e.registered_by,
    };
  });

  // Seeded entrants sort by seed; unseeded fall back to rating desc.
  entrants.sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed;
    if (a.seed != null) return -1;
    if (b.seed != null) return 1;
    return b.rating - a.rating;
  });

  let bracket: BracketNode[] = [];
  if (t.status === "live" || t.status === "completed") {
    const { data: mRows } = await supabase
      .from("bracket_matches")
      .select("id,round,slot,team_a,team_b,score_a,score_b,winner,status")
      .eq("tournament_id", t.id)
      .order("round", { ascending: true })
      .order("slot", { ascending: true });

    const nameById = await fetchTeams(
      (mRows ?? []).flatMap((m) => [m.team_a, m.team_b, m.winner]),
    );

    bracket = (mRows ?? []).map((m): BracketNode => ({
      id: m.id,
      round: m.round,
      slot: m.slot,
      teamA: m.team_a
        ? nameById.get(m.team_a) ?? { id: m.team_a, name: "Unknown", tag: null }
        : null,
      teamB: m.team_b
        ? nameById.get(m.team_b) ?? { id: m.team_b, name: "Unknown", tag: null }
        : null,
      scoreA: m.score_a,
      scoreB: m.score_b,
      winner: m.winner,
      status: m.status,
    }));
  }

  const champion = t.champion_team_id
    ? (await fetchTeams([t.champion_team_id])).get(t.champion_team_id) ?? null
    : null;

  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    gameId,
    size: t.size,
    scope: t.scope,
    region: t.region,
    status: t.status,
    startsAt: t.starts_at,
    hostProfileId: t.host_profile_id,
    hostHandle,
    ratingEffect: t.rating_effect,
    champion,
    entrants,
    rounds,
    bracket,
  };
}

/** Teams the profile handles in a given game — for the register control. */
export async function handledTeamsInGame(
  userId: string,
  game: GameId,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id,name")
    .eq("handler_id", userId)
    .eq("game_id", game)
    .order("name");
  return (data ?? []).map((t) => ({ id: t.id, name: t.name }));
}
