"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGameId } from "@/features/games/config";
import {
  isMentorshipKind,
  NOTES_MAX,
  NOTES_MIN,
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

/**
 * Create an open mentorship request. `mentee_id` is forced to the authed user
 * (matches the RLS insert check). Redirects to `/mentorship` on success; returns
 * `{ ok: false, error }` for `useActionState` on validation / DB failure.
 */
export async function createRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in?next=/mentorship/new");

  const kind = String(formData.get("kind") ?? "");
  const gameRaw = String(formData.get("game_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!isMentorshipKind(kind)) {
    return { ok: false, error: "Pick what kind of help you need." };
  }
  if (notes.length < NOTES_MIN) {
    return {
      ok: false,
      error: `Add a little more detail — at least ${NOTES_MIN} characters.`,
    };
  }
  if (notes.length > NOTES_MAX) {
    return { ok: false, error: `Keep the notes under ${NOTES_MAX} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mentorship_requests").insert({
    mentee_id: userId,
    kind,
    game_id: isGameId(gameRaw) ? gameRaw : null,
    status: "open",
    notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mentorship");
  redirect("/mentorship");
}

/** Pull the target request id out of a bound form submission. */
function requestId(formData: FormData): string {
  return String(formData.get("id") ?? "");
}

/**
 * Offer to mentor an open request. Goes through `accept_mentorship`, which sets
 * `mentor_id = auth.uid()` and flips status to `matched` only while the row is
 * still open and not the caller's own.
 */
export async function acceptRequest(formData: FormData): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Session expired. Sign in again." };

  const id = requestId(formData);
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_mentorship", { p_id: id });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "request not open"
          ? "Someone already took this one."
          : error.message,
    };
  }

  revalidatePath("/mentorship");
  return { ok: true };
}

/** Mentee cancels their own request. */
export async function cancelRequest(formData: FormData): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Session expired. Sign in again." };

  const id = requestId(formData);
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorship_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("mentee_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mentorship");
  return { ok: true };
}

/** Mentee marks their request done. */
export async function completeRequest(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Session expired. Sign in again." };

  const id = requestId(formData);
  if (!id) return { ok: false, error: "Missing request id." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorship_requests")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("mentee_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mentorship");
  return { ok: true };
}
