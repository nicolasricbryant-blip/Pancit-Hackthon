import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

/**
 * Server-only session helpers. Importing `next/headers` (via the server client)
 * makes this module unusable from Client Components — by design.
 *
 * `getCurrentProfile` is wrapped in React `cache()` so many callers in one render
 * pass (layout, header, page) share a single round-trip.
 */

/** The authenticated Supabase auth user, or null. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** The full `profiles` row for the current user, or null if signed out. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
});

/**
 * Require a signed-in profile. Redirects to `/sign-in?next=…` when signed out.
 * When `next` is omitted the caller-side redirect target is lost, so pass the
 * current path from the page when you can.
 */
export async function requireProfile(next?: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  }
  return profile;
}
