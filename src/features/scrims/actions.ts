"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

/**
 * Scrim request mutations — send / accept / decline. Every write re-checks
 * the caller server-side (never trusts a client-supplied team id), matching
 * the RLS policies in 20260911010018_scrim_requests.sql so a bypass attempt
 * fails twice.
 */

/** Resolve the signed-in user id, or null. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface RequestScrimInput {
  listingId: string;
  message: string;
}

/**
 * Send a scrim request from the caller's handled team to a listing's team.
 * `from_team` is resolved server-side from the listing's game — NEVER accept
 * a team id from the client, or any signed-in handler could request on
 * behalf of a team they don't actually run.
 */
export async function requestScrim(input: RequestScrimInput): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in to request a scrim." };

  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from("scrim_listings")
    .select("id, team_id, game_id, status")
    .eq("id", input.listingId)
    .maybeSingle();
  if (listingError || !listing) {
    return { ok: false, error: "That listing no longer exists." };
  }
  if (listing.status !== "open") {
    return { ok: false, error: "This listing is no longer open." };
  }

  const { data: handled } = await supabase
    .from("teams")
    .select("id")
    .eq("game_id", listing.game_id)
    .eq("handler_id", userId)
    .limit(1);
  const fromTeam = handled?.[0]?.id ?? null;
  if (!fromTeam) {
    return {
      ok: false,
      error: "You need to handle a team in this game to request a scrim.",
    };
  }
  if (fromTeam === listing.team_id) {
    return { ok: false, error: "You can't request your own listing." };
  }

  const message = input.message.trim();
  const { error } = await supabase.from("scrim_requests").insert({
    listing_id: listing.id,
    from_team: fromTeam,
    to_team: listing.team_id,
    requested_by: userId,
    message: message || null,
  });

  if (error) {
    // The (listing_id, from_team) unique index — covers both a genuine
    // double-click and a cancelled/declined request that can't be reused yet.
    if (error.code === "23505") {
      return { ok: false, error: "You've already requested this listing." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  return { ok: true };
}

/**
 * Accept a pending request: books the match, declines the listing's other
 * pending bids, and flips the listing to matched — all inside
 * accept_scrim_request(), atomically. RLS can't gate this the normal way
 * (the caller only ever sees pending requests addressed to a team they
 * handle, but the function itself re-checks that authorization since it runs
 * SECURITY DEFINER and bypasses RLS).
 */
export async function acceptScrimRequest(requestId: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in to manage scrim requests." };

  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("accept_scrim_request", {
    p_id: requestId,
  });

  if (error || !matchId) {
    return {
      ok: false,
      error: error?.message ?? "Could not accept this request.",
    };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  return { ok: true };
}

/**
 * Decline a pending request. A plain RLS-gated update — no booking to do, so
 * no RPC needed. `.eq("status", "pending")` guards against a double-decline
 * (or declining one the other side just cancelled/accepted) racing this.
 */
export async function declineScrimRequest(requestId: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in to manage scrim requests." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrim_requests")
    .update({
      status: "declined",
      responded_by: userId,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This request was already handled." };

  revalidatePath("/matches");
  return { ok: true };
}
