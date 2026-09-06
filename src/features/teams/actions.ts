"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGameId } from "@/features/games/config";
import { isHandler } from "@/features/auth/roles";
import {
  isRosterRole,
  normalizeTag,
  type ActionResult,
  type RosterRole,
} from "./types";

/** Resolve the signed-in user id, or null. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** True when `userId` is the handler of `teamId`. */
async function ownsTeam(userId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("handler_id")
    .eq("id", teamId)
    .maybeSingle();
  return !!data && data.handler_id === userId;
}

export interface CreateTeamInput {
  name: string;
  tag: string;
  gameId: string;
  schoolId: string | null;
  region: string;
  bio: string;
}

/**
 * Create a team owned by the current handler, seat them as captain, and seed the
 * team's rating / reliability / standing rows. Redirects to the new profile.
 */
export async function createTeam(
  input: CreateTeamInput,
): Promise<ActionResult | void> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in?next=/teams/new");

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", userId)
    .maybeSingle();
  if (!isHandler(profile)) {
    return { ok: false, error: "Team Handler role required." };
  }

  const name = input.name.trim();
  const tag = normalizeTag(input.tag);
  const region = input.region.trim();
  const bio = input.bio.trim();

  if (name.length < 2) return { ok: false, error: "Team name is too short." };
  if (tag.length < 2) return { ok: false, error: "Tag must be 2–5 characters." };
  if (!isGameId(input.gameId)) return { ok: false, error: "Pick a game." };
  if (region.length < 2) return { ok: false, error: "Region is required." };

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      tag,
      game_id: input.gameId,
      school_id: input.schoolId,
      region,
      bio: bio || null,
      handler_id: userId,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return { ok: false, error: teamError?.message ?? "Could not create team." };
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    profile_id: userId,
    role: "captain",
  });
  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  // Seed stat rows. Best-effort: the profile page falls back to defaults if a
  // row is missing (e.g. the RLS insert policy in _schema.sql is not applied).
  await Promise.all([
    supabase
      .from("ratings")
      .insert({ game_id: input.gameId, team_id: team.id, rating: 1500 }),
    supabase
      .from("reliability_scores")
      .insert({ team_id: team.id, score: 100 }),
    supabase
      .from("community_standing")
      .insert({ team_id: team.id, points: 0 }),
  ]);

  revalidatePath("/teams");
  redirect(`/teams/${team.id}`);
}

export interface UpdateTeamInput {
  teamId: string;
  name: string;
  tag: string;
  gameId: string;
  schoolId: string | null;
  region: string;
  bio: string;
}

/** Edit a team's core fields. Handler only. */
export async function updateTeam(input: UpdateTeamInput): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };
  if (!(await ownsTeam(userId, input.teamId))) {
    return { ok: false, error: "Only the team handler can edit this team." };
  }

  const name = input.name.trim();
  const tag = normalizeTag(input.tag);
  const region = input.region.trim();
  const bio = input.bio.trim();

  if (name.length < 2) return { ok: false, error: "Team name is too short." };
  if (tag.length < 2) return { ok: false, error: "Tag must be 2–5 characters." };
  if (!isGameId(input.gameId)) return { ok: false, error: "Pick a game." };
  if (region.length < 2) return { ok: false, error: "Region is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name,
      tag,
      game_id: input.gameId,
      school_id: input.schoolId,
      region,
      bio: bio || null,
    })
    .eq("id", input.teamId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teams/${input.teamId}`);
  revalidatePath(`/teams/${input.teamId}/manage`);
  revalidatePath("/teams");
  return { ok: true };
}

/** Add a roster member by exact profile handle. Handler only. */
export async function addMemberByHandle(input: {
  teamId: string;
  handle: string;
  role: RosterRole;
  jerseyName: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };
  if (!(await ownsTeam(userId, input.teamId))) {
    return { ok: false, error: "Only the team handler can manage the roster." };
  }

  const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { ok: false, error: "Enter a handle." };
  if (!isRosterRole(input.role)) return { ok: false, error: "Pick a role." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (!profile) {
    return { ok: false, error: `No user with the handle @${handle}.` };
  }

  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `@${handle} is already on this roster.` };
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: input.teamId,
    profile_id: profile.id,
    role: input.role,
    jersey_name: input.jerseyName.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teams/${input.teamId}`);
  revalidatePath(`/teams/${input.teamId}/manage`);
  return { ok: true };
}

/** Load a member row with its team, guarding handler ownership. */
async function memberWithOwnership(
  userId: string,
  memberId: string,
): Promise<
  | { ok: true; teamId: string; role: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("team_id,role,teams(handler_id)")
    .eq("id", memberId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Member not found." };
  const team = Array.isArray(data.teams) ? data.teams[0] : data.teams;
  if (!team || team.handler_id !== userId) {
    return { ok: false, error: "Only the team handler can manage the roster." };
  }
  return { ok: true, teamId: data.team_id, role: data.role };
}

/** How many captains a team currently has. */
async function captainCount(teamId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("role", "captain");
  return data?.length ?? 0;
}

/** Change a member's role and/or jersey name. Handler only. */
export async function updateMember(input: {
  memberId: string;
  role: RosterRole;
  jerseyName: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };
  if (!isRosterRole(input.role)) return { ok: false, error: "Pick a role." };

  const guard = await memberWithOwnership(userId, input.memberId);
  if (!guard.ok) return guard;

  if (
    guard.role === "captain" &&
    input.role !== "captain" &&
    (await captainCount(guard.teamId)) <= 1
  ) {
    return {
      ok: false,
      error: "Assign another captain before changing this one's role.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ role: input.role, jersey_name: input.jerseyName.trim() || null })
    .eq("id", input.memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teams/${guard.teamId}`);
  revalidatePath(`/teams/${guard.teamId}/manage`);
  return { ok: true };
}

/** Remove a member from the roster. Handler only; can't drop the last captain. */
export async function removeMember(input: {
  memberId: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const guard = await memberWithOwnership(userId, input.memberId);
  if (!guard.ok) return guard;

  if (guard.role === "captain" && (await captainCount(guard.teamId)) <= 1) {
    return {
      ok: false,
      error: "Assign another captain before removing this one.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", input.memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teams/${guard.teamId}`);
  revalidatePath(`/teams/${guard.teamId}/manage`);
  return { ok: true };
}
