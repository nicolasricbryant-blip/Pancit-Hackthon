import { createClient } from "@/lib/supabase/server";
import type { School } from "./types";

/** Lower-cased domain part of an email, or null when it doesn't look like one. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/** True when the email's domain is a Philippine collegiate domain (`*.edu.ph`). */
export function isSchoolEmail(email: string): boolean {
  const d = emailDomain(email);
  return !!d && d.endsWith(".edu.ph");
}

/**
 * Find the school whose `email_domains` array contains this email's domain.
 * Returns null when nothing matches. Server-only (queries Supabase).
 */
export async function matchSchoolByEmail(
  email: string,
): Promise<School | null> {
  const domain = emailDomain(email);
  if (!domain) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("*")
    .contains("email_domains", [domain])
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
