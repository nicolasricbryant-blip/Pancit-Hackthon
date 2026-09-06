"use client";

import { createContext, useContext, useMemo } from "react";
import type { Profile, Role } from "./types";
import { navRoles } from "./roles";

interface AuthValue {
  /** The current user's profile row, or null when signed out. */
  profile: Profile | null;
  /** Convenience: profile.roles narrowed to the nav `Role` union. */
  roles: Role[];
  isAuthed: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Seeded once from the root layout with the server-fetched profile, so the header
 * and nav render the right role-gated items with no client round-trip.
 */
export function AuthProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const value = useMemo<AuthValue>(
    () => ({
      profile,
      roles: navRoles(profile),
      isAuthed: !!profile,
    }),
    [profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the seeded auth context. Throws if used outside <AuthProvider>. */
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
