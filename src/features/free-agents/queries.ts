import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/features/auth/session";
import type { GameId } from "@/features/games/config";
import { isLookingFor, type FreeAgentPostView } from "./types";

/** First element of a Supabase nested relation, or null. */
function one<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Open listings for one game, newest first, joined to author + team. */
export async function getOpenPostsForGame(
  game: GameId,
): Promise<FreeAgentPostView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("free_agent_posts")
    .select(
      "id, profile_id, looking_for, rank_label, roles_wanted, blurb, created_at, profiles(handle, display_name), teams(name, tag)",
    )
    .eq("status", "open")
    .eq("game_id", game)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`free_agent_posts query failed: ${error.message}`);

  return (data ?? []).map((row): FreeAgentPostView => {
    const author = one(row.profiles);
    const team = one(row.teams);
    return {
      id: row.id,
      profileId: row.profile_id,
      lookingFor: isLookingFor(row.looking_for) ? row.looking_for : "team",
      rankLabel: row.rank_label,
      rolesWanted: row.roles_wanted ?? [],
      blurb: row.blurb,
      createdAt: row.created_at,
      handle: author?.handle ?? null,
      displayName: author?.display_name ?? null,
      team: team ? { name: team.name, tag: team.tag } : null,
    };
  });
}

/** The signed-in user's id, or null — used to show owners a Close button. */
export async function getViewerId(): Promise<string | null> {
  const user = await getUser();
  return user?.id ?? null;
}

export interface NewPostContext {
  roles: string[];
  teams: { id: string; name: string; tag: string | null }[];
}

/** Profile roles + teams the current user handles, for the create form. */
export async function getNewPostContext(userId: string): Promise<NewPostContext> {
  const supabase = await createClient();

  const [{ data: profile }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("roles").eq("id", userId).maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, tag")
      .eq("handler_id", userId)
      .order("name"),
  ]);

  return {
    roles: profile?.roles ?? [],
    teams: teams ?? [],
  };
}
