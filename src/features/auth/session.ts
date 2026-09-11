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
 *
 * A null `getCurrentProfile()` result is ambiguous — signed out, or signed in
 * with no `profiles` row at all (predates the `handle_new_user` trigger, or
 * the row was never created) — and the two need different redirects. Sending
 * the second case to `/sign-in` is a bug: `/sign-in` immediately redirects a
 * signed-in user back to `next`, which is this same page, so a profile-less
 * user ping-pongs `/sign-in` <-> `next` forever (ERR_TOO_MANY_REDIRECTS).
 * `/onboarding` upserts a `profiles` row on submit (see OnboardingForm), so
 * it's the one place that actually gets such an account unstuck.
 */
export async function requireProfile(next?: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    const user = await getUser();
    if (!user) {
      redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
    }

    // getCurrentProfile() swallows its own read error and returns null either
    // way, so a null result here is ambiguous: no `profiles` row at all, or
    // the read itself failed. The two need very different handling — a
    // transient failure must never read as "no profile" and send someone with
    // a perfectly good profile into onboarding. Re-check explicitly so a real
    // query error surfaces as a real error (the route's error boundary),
    // never as a silent redirect.
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        `requireProfile: could not verify a profile for ${user.id}: ${error.message}`,
      );
    }

    if (!row) {
      // The query succeeded and genuinely found no row (predates the
      // handle_new_user trigger, or the row was never created). /onboarding
      // upserts one on submit (see OnboardingForm) — the one place that gets
      // such an account unstuck. `next === "/onboarding"` guards against a
      // future caller invoking requireProfile from the onboarding page itself.
      redirect(next === "/onboarding" ? "/" : "/onboarding");
    }

    // The row exists after all, so getCurrentProfile()'s own read must have
    // hit a transient failure it swallowed — its cached null can't be retried
    // within this render, so fetch the full row directly.
    const { data: full, error: fullError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (fullError || !full) {
      throw new Error(
        `requireProfile: profile row exists for ${user.id} but could not be read: ${
          fullError?.message ?? "unknown error"
        }`,
      );
    }
    return full;
  }
  return profile;
}
