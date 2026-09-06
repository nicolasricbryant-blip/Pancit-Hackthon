"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGameId } from "@/features/games/config";
import { isAdmin } from "@/features/auth/roles";
import {
  isBracketSize,
  isScope,
  isValidSlug,
  type ActionResult,
} from "./types";

/** Resolve the signed-in user id, or null. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** True when the user is the tournament host or a platform admin. */
async function canHostManage(
  userId: string,
  hostProfileId: string | null,
): Promise<boolean> {
  if (hostProfileId && hostProfileId === userId) return true;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", userId)
    .maybeSingle();
  return isAdmin(profile);
}

/**
 * A `datetime-local` value is a bare wall-clock string with no zone. PH is a
 * fixed UTC+8 (no DST), so pin +08:00 explicitly before converting to an ISO
 * instant. Returns null when the string can't be parsed.
 */
function manilaLocalToIso(local: string): string | null {
  const withSecs = local.length === 16 ? `${local}:00` : local;
  const d = new Date(`${withSecs}+08:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface CreateTournamentInput {
  name: string;
  slug: string;
  gameId: string;
  size: number;
  scope: string;
  region: string;
  ratingEffect: boolean;
  startsAt: string;
}

/**
 * Create a tournament owned by the current user, status 'registration'.
 * Redirects to the new tournament page on success.
 */
export async function createTournament(
  input: CreateTournamentInput,
): Promise<ActionResult | void> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in?next=/brackets/new");

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const region = input.region.trim();

  if (name.length < 3) {
    return { ok: false, error: "Name must be at least 3 characters." };
  }
  if (!isValidSlug(slug)) {
    return {
      ok: false,
      error: "URL must be 2–39 characters: lowercase letters, numbers, hyphens.",
    };
  }
  if (!isGameId(input.gameId)) return { ok: false, error: "Pick a game." };
  if (!isBracketSize(input.size)) {
    return { ok: false, error: "Pick a bracket size." };
  }
  if (!isScope(input.scope)) return { ok: false, error: "Pick a scope." };
  if (region.length < 2) return { ok: false, error: "Region is required." };

  let startsAtIso: string | null = null;
  if (input.startsAt) {
    startsAtIso = manilaLocalToIso(input.startsAt);
    if (!startsAtIso) return { ok: false, error: "Start time is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").insert({
    name,
    slug,
    game_id: input.gameId,
    format: "single_elim",
    size: input.size,
    scope: input.scope,
    region,
    rating_effect: input.ratingEffect,
    starts_at: startsAtIso,
    host_profile_id: userId,
    status: "registration",
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That URL is taken." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/brackets");
  redirect(`/brackets/${slug}`);
}

/** Register a team the caller handles into a tournament that's still in registration. */
export async function registerTeam(
  slug: string,
  teamId: string,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("id,status,game_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!t) return { ok: false, error: "Tournament not found." };
  if (t.status !== "registration") {
    return { ok: false, error: "Registration is closed." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id,handler_id,game_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!team || team.handler_id !== userId) {
    return { ok: false, error: "You can only register a team you handle." };
  }
  if (team.game_id !== t.game_id) {
    return { ok: false, error: "That team plays a different game." };
  }

  const { error } = await supabase.from("tournament_entrants").insert({
    tournament_id: t.id,
    team_id: teamId,
    registered_by: userId,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That team is already registered." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/brackets/${slug}`);
  return { ok: true };
}

/** Withdraw the caller's own team while the tournament is still in registration. */
export async function withdrawTeam(
  slug: string,
  teamId: string,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("id,status")
    .eq("slug", slug)
    .maybeSingle();
  if (!t) return { ok: false, error: "Tournament not found." };
  if (t.status !== "registration") {
    return { ok: false, error: "Can't withdraw once the bracket is generated." };
  }

  // RLS restricts the delete to the team's handler or the tournament host.
  const { error } = await supabase
    .from("tournament_entrants")
    .delete()
    .eq("tournament_id", t.id)
    .eq("team_id", teamId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/brackets/${slug}`);
  revalidatePath(`/brackets/${slug}/manage`);
  return { ok: true };
}

/** Host removes an entrant (by entrant row id) during registration. */
export async function removeEntrant(
  slug: string,
  entrantId: string,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("id,status,host_profile_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!t) return { ok: false, error: "Tournament not found." };
  if (!(await canHostManage(userId, t.host_profile_id))) {
    return { ok: false, error: "Only the host can manage entrants." };
  }
  if (t.status !== "registration") {
    return { ok: false, error: "The bracket has already been generated." };
  }

  const { error } = await supabase
    .from("tournament_entrants")
    .delete()
    .eq("id", entrantId)
    .eq("tournament_id", t.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/brackets/${slug}`);
  revalidatePath(`/brackets/${slug}/manage`);
  return { ok: true };
}

/** Seed + build the single-elim tree via the `generate_bracket` RPC. Host only. */
export async function generateBracket(slug: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("id,host_profile_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!t) return { ok: false, error: "Tournament not found." };
  if (!(await canHostManage(userId, t.host_profile_id))) {
    return { ok: false, error: "Only the host can generate the bracket." };
  }

  const { error } = await supabase.rpc("generate_bracket", {
    p_tournament: t.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/brackets/${slug}`);
  revalidatePath(`/brackets/${slug}/manage`);
  return { ok: true };
}

/** Report + confirm a bracket match score via `advance_bracket_match`. Host only. */
export async function reportMatch(
  slug: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    return { ok: false, error: "Enter whole numbers, 0 or higher, for both scores." };
  }
  if (scoreA === scoreB) {
    return { ok: false, error: "A bracket match cannot be a draw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_bracket_match", {
    p_match: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/brackets/${slug}`);
  revalidatePath(`/brackets/${slug}/manage`);
  return { ok: true };
}
