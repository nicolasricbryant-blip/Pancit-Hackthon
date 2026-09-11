"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";
import type { GameId } from "@/features/games/config";
import { isAdmin } from "@/features/auth/roles";
import type { RankValues } from "./form";

/**
 * Server actions for rank verification.
 *
 * RLS does the real enforcement — `auth.uid() = profile_id` on both
 * `game_profiles` and `rank_submissions`, and `public.is_admin()` on reviews —
 * so every id here is taken from the session, never from client input.
 *
 * `approveSubmission`/`rejectSubmission` additionally guard with an explicit
 * `isAdmin()` check (same pattern as `createTeam`'s `isHandler` check) and
 * verify row counts on the updates. Without both, a non-admin invoking the
 * action directly gets RLS-denied updates that report `error: null` with zero
 * rows affected — a false "success" plus a `revalidatePath`, even though RLS
 * itself holds and nothing is actually written.
 */

export interface SubmitRankInput {
  gameId: GameId;
  claimedRank: RankValues;
  rankLabel: string;
  screenshotPath: string;
}

type ActionError = { error: string };

/**
 * Upsert the player's `game_profiles` row to `pending`, then log a
 * `rank_submissions` row. Redirects to `/rank?game=<id>` on success.
 */
export async function submitRank(
  input: SubmitRankInput,
): Promise<ActionError | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const claimed: Json = input.claimedRank;

  const { data: gp, error: gpErr } = await supabase
    .from("game_profiles")
    .upsert(
      {
        profile_id: user.id,
        game_id: input.gameId,
        claimed_rank: claimed,
        rank_label: input.rankLabel,
        verification_status: "pending",
      },
      { onConflict: "profile_id,game_id" },
    )
    .select("id")
    .single();
  if (gpErr || !gp) {
    return { error: gpErr?.message ?? "Could not save your rank." };
  }

  const { error: subErr } = await supabase.from("rank_submissions").insert({
    game_profile_id: gp.id,
    profile_id: user.id,
    game_id: input.gameId,
    claimed_rank: claimed,
    screenshot_path: input.screenshotPath,
    status: "pending",
  });
  if (subErr) return { error: subErr.message };

  redirect(`/rank?game=${input.gameId}`);
}

/** Approve a pending submission and mark the linked game profile verified. */
export async function approveSubmission(
  submissionId: string,
): Promise<ActionError | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdmin(profile)) {
    return { error: "Admin role required." };
  }

  const { data: sub, error: subErr } = await supabase
    .from("rank_submissions")
    .select("id, game_profile_id")
    .eq("id", submissionId)
    .single();
  if (subErr || !sub) {
    return { error: subErr?.message ?? "Submission not found." };
  }

  const reviewedAt = new Date().toISOString();

  const { data: updRow, error: updErr } = await supabase
    .from("rank_submissions")
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewer_id: user.id,
    })
    .eq("id", submissionId)
    .select("id")
    .maybeSingle();
  if (updErr) return { error: updErr.message };
  if (!updRow) return { error: "Could not update the submission." };

  const { data: gpRow, error: gpErr } = await supabase
    .from("game_profiles")
    .update({ verification_status: "verified" })
    .eq("id", sub.game_profile_id)
    .select("id")
    .maybeSingle();
  if (gpErr) return { error: gpErr.message };
  if (!gpRow) return { error: "Could not update the game profile." };

  revalidatePath("/rank/review");
  revalidatePath("/rank");
}

/** Reject a pending submission with a required reason; mark the profile rejected. */
export async function rejectSubmission(
  submissionId: string,
  reason: string,
): Promise<ActionError | void> {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "A rejection reason is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdmin(profile)) {
    return { error: "Admin role required." };
  }

  const { data: sub, error: subErr } = await supabase
    .from("rank_submissions")
    .select("id, game_profile_id")
    .eq("id", submissionId)
    .single();
  if (subErr || !sub) {
    return { error: subErr?.message ?? "Submission not found." };
  }

  const reviewedAt = new Date().toISOString();

  const { data: updRow, error: updErr } = await supabase
    .from("rank_submissions")
    .update({
      status: "rejected",
      review_reason: trimmed,
      reviewed_at: reviewedAt,
      reviewer_id: user.id,
    })
    .eq("id", submissionId)
    .select("id")
    .maybeSingle();
  if (updErr) return { error: updErr.message };
  if (!updRow) return { error: "Could not update the submission." };

  const { data: gpRow, error: gpErr } = await supabase
    .from("game_profiles")
    .update({ verification_status: "rejected" })
    .eq("id", sub.game_profile_id)
    .select("id")
    .maybeSingle();
  if (gpErr) return { error: gpErr.message };
  if (!gpRow) return { error: "Could not update the game profile." };

  revalidatePath("/rank/review");
  revalidatePath("/rank");
}
