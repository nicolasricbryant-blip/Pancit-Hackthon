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
const AUTH_PREFIXES = ["/onboarding", "/settings", "/rank", "/matches"];

/** Auth-required patterns under the otherwise-public /teams browse route. */
const AUTH_TEAMS = [/^\/teams\/new(?:\/|$)/, /^\/teams\/[^/]+\/manage(?:\/|$)/];

function needsAuth(pathname: string): boolean {
  if (AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return AUTH_TEAMS.some((re) => re.test(pathname));
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

  // 2 · first-run trap: authed but no school picked yet → force onboarding.
  //     Exempt /onboarding itself and the sign-out route so the user isn't stuck.
  if (
    user &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/auth/")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.school_id) {
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
