import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

/**
 * Browser-side Supabase client (Client Components).
 *
 * Wired to the live project via NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY. Typed with
 * the generated `Database` schema so every query is checked at compile time.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env not set. Copy .env.local.example to .env.local and fill " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
