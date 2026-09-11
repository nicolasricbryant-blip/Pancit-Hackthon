"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGameId } from "@/features/games/config";
import {
  BLURB_MAX,
  ROLE_OPTIONS,
  isLookingFor,
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

export interface CreatePostInput {
  game: string;
  lookingFor: string;
  teamId: string | null;
  rankLabel: string;
  rolesWanted: string[];
  blurb: string;
}

/**
 * Create a free-agent listing owned by the current user. `profile_id` is forced
 * to the authed user to match the RLS insert check. Redirects to the board on
 * success; returns an error result on validation / DB failure.
 */
export async function createPost(
  input: CreatePostInput,
): Promise<ActionResult | void> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in?next=/free-agents/new");

  if (!isGameId(input.game)) return { ok: false, error: "Pick a game." };
  if (!isLookingFor(input.lookingFor)) {
    return { ok: false, error: "Choose what you're looking for." };
  }

  const rankLabel = input.rankLabel.trim();
  const blurb = input.blurb.trim();
  if (blurb.length > BLURB_MAX) {
    return { ok: false, error: `Keep the blurb under ${BLURB_MAX} characters.` };
  }

  const allowed = new Set<string>(ROLE_OPTIONS);
  const rolesWanted = [...new Set(input.rolesWanted)].filter((r) =>
    allowed.has(r),
  );

  // A team is only meaningful when a handler posts "team seeking player".
  const teamId =
    input.lookingFor === "player" && input.teamId ? input.teamId : null;

  const supabase = await createClient();

  if (teamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("handler_id")
      .eq("id", teamId)
      .maybeSingle();
    if (!team || team.handler_id !== userId) {
      return { ok: false, error: "You don't handle that team." };
    }
  }

  const { error } = await supabase.from("free_agent_posts").insert({
    profile_id: userId,
    game_id: input.game,
    looking_for: input.lookingFor,
    team_id: teamId,
    rank_label: rankLabel || null,
    roles_wanted: rolesWanted,
    blurb: blurb || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/free-agents");
  redirect(`/free-agents?game=${input.game}`);
}

/** Flip one of the caller's own listings to `closed`. Owner only (also via RLS). */
export async function closePost(id: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("free_agent_posts")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("profile_id", userId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  // `.update().eq()` reports `error: null` even when zero rows matched (not
  // the caller's post, or already gone) — verify a row actually came back.
  if (!data) return { ok: false, error: "That listing couldn't be found." };

  revalidatePath("/free-agents");
  return { ok: true };
}
