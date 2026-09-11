import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

/**
 * Proxy (Next.js 16 — the former `middleware.ts`). Two jobs:
 *   1. Refresh the Supabase auth session on every request (standard @supabase/ssr
 *      cookie pass-through so Server Components see a fresh session).
 *   2. Route gating — public vs. auth-required, plus the first-run onboarding trap.
 */

/** Auth-required path prefixes. Everything else the matcher hits is public. */
const AUTH_PREFIXES = [
  "/onboarding",
  "/settings",
  "/rank",
  "/matches",
  "/mentorship",
  "/profile",
  "/notifications",
];

/** Auth-required patterns under otherwise-public browse routes. */
const AUTH_PATTERNS = [
  /^\/teams\/new(?:\/|$)/,
  /^\/teams\/[^/]+\/manage(?:\/|$)/,
  /^\/free-agents\/new(?:\/|$)/,
  /^\/orgs\/new(?:\/|$)/,
  /^\/orgs\/[^/]+\/manage(?:\/|$)/,
  /^\/brackets\/new(?:\/|$)/,
  /^\/brackets\/[^/]+\/manage(?:\/|$)/,
];

function needsAuth(pathname: string): boolean {
  if (AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return AUTH_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token and triggers the cookie refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // 1 · auth-required routes
  if (!user && needsAuth(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(signIn);
  }

  // 2 · first-run trap: authed but setup not finished → force onboarding.
  //     Keyed on `profiles.onboarded`, NOT school_id — school is optional now, so
  //     a tester on a non-.edu.ph address can finish without picking one.
  //     A *missing* `profiles` row (predates the handle_new_user trigger, or
  //     was never created) is treated the same as `onboarded === false`:
  //     /onboarding's submit upserts the row, so it's the only path that gets
  //     such an account unstuck — requireProfile() mirrors this for the same
  //     reason (see session.ts).
  //     Exempt /onboarding itself and the sign-out route so the user isn't stuck.
  if (
    user &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/auth/")
  ) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();

    // Fail OPEN on a failed read. `maybeSingle()` returns `data: null` for
    // both "no such row" and "the query errored" — those need opposite
    // handling here. The proxy runs on *every* request, so treating a
    // transient Supabase hiccup as "not onboarded" would bounce every
    // signed-in user in the app to /onboarding, telling them to set up a
    // profile they already have, until the hiccup passes. Do NOT simplify
    // this back to `!profile || !profile.onboarded` — that reintroduces
    // exactly that failure mode.
    if (!profileError && (!profile || !profile.onboarded)) {
      const onboarding = request.nextUrl.clone();
      onboarding.pathname = "/onboarding";
      onboarding.search = "";
      return NextResponse.redirect(onboarding);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * All request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon.ico, manifest.webmanifest, sw.js, icons/ (PWA assets)
     * - common image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
