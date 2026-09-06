import type { Role, Profile } from "./types";

/**
 * Pure, isomorphic, null-safe role checks. Safe to import from Server Components,
 * Client Components, and the proxy. A null profile has no roles.
 */

export function hasRole(
  profile: Pick<Profile, "roles"> | null | undefined,
  role: Role,
): boolean {
  return !!profile && Array.isArray(profile.roles) && profile.roles.includes(role);
}

export function isPlayer(
  profile: Pick<Profile, "roles"> | null | undefined,
): boolean {
  return hasRole(profile, "player");
}

export function isHandler(
  profile: Pick<Profile, "roles"> | null | undefined,
): boolean {
  return hasRole(profile, "handler");
}

export function isAdmin(
  profile: Pick<Profile, "roles"> | null | undefined,
): boolean {
  return hasRole(profile, "admin");
}

/** Roles narrowed to the nav `Role` union (drops any unknown DB values). */
export function navRoles(
  profile: Pick<Profile, "roles"> | null | undefined,
): Role[] {
  const known: Role[] = ["player", "handler", "admin"];
  const raw = profile?.roles ?? [];
  return known.filter((r) => raw.includes(r));
}
