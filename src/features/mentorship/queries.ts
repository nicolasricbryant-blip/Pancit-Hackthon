import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/features/auth/session";
import type { GameId } from "@/features/games/config";
import type { MentorshipRequest } from "./types";

/** A mentee's own request, plus the resolved mentor handle when matched. */
export interface MyRequestView extends MentorshipRequest {
  mentorHandle: string | null;
}

/** An open request on the mentor board, plus the resolved mentee handle. */
export interface OpenRequestView extends MentorshipRequest {
  menteeHandle: string | null;
}

/** Map a set of profile ids to a display handle (`@handle` fallback name). */
async function handlesByIds(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", uniq);

  for (const p of data ?? []) {
    map.set(p.id, p.handle ?? p.display_name ?? null);
  }
  return map;
}

/**
 * The signed-in user's own mentorship requests, newest first. RLS already
 * scopes `mentorship_requests` to rows where the caller is mentee or mentor, so
 * a plain select is enough here.
 */
export async function getMyRequests(): Promise<MyRequestView[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_requests")
    .select("*")
    .eq("mentee_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`mentorship_requests query failed: ${error.message}`);

  const rows = data ?? [];
  const handles = await handlesByIds(
    rows.map((r) => r.mentor_id ?? "").filter(Boolean),
  );

  return rows.map((r) => ({
    ...r,
    mentorHandle: r.mentor_id ? handles.get(r.mentor_id) ?? null : null,
  }));
}

/**
 * Open requests the signed-in user could pick up (never their own). Goes through
 * the `list_open_mentorships` SECURITY DEFINER RPC because RLS would otherwise
 * hide rows the caller is not yet attached to.
 */
export async function getOpenRequests(
  game?: GameId,
): Promise<OpenRequestView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "list_open_mentorships",
    game ? { p_game: game } : {},
  );

  if (error) {
    throw new Error(`list_open_mentorships failed: ${error.message}`);
  }

  const rows = (data ?? []) as MentorshipRequest[];
  const handles = await handlesByIds(rows.map((r) => r.mentee_id));

  return rows.map((r) => ({
    ...r,
    menteeHandle: handles.get(r.mentee_id) ?? null,
  }));
}
