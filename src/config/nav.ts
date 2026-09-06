/**
 * Central route + nav registry. Feature agents add their routes here instead of
 * editing shared components. The header renders PRIMARY_NAV; auth wires the
 * role-gating and the sign-in / profile menu.
 */

export type Role = "player" | "handler" | "admin";

export interface NavItem {
  href: string;
  label: string;
  /** Visible only when the current profile has one of these roles. Empty = always. */
  roles?: Role[];
  /** Carry the active `?game=` param across navigation (all competitive content is game-scoped). */
  gameScoped?: boolean;
}

export const ROUTES = {
  scrims: "/",
  leaderboards: "/leaderboards",
  events: "/events",
  teams: "/teams",
  matches: "/matches",
  rank: "/rank",
  rankReview: "/rank/review",
  brackets: "/brackets",
  freeAgents: "/free-agents",
  mentorship: "/mentorship",
  orgs: "/orgs",
  signIn: "/sign-in",
  signUp: "/sign-up",
  onboarding: "/onboarding",
  settings: "/settings",
} as const;

export const PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.scrims, label: "Scrims", gameScoped: true },
  { href: ROUTES.leaderboards, label: "Leaderboards", gameScoped: true },
  { href: ROUTES.events, label: "Events", gameScoped: true },
  { href: ROUTES.teams, label: "Teams", gameScoped: true },
  { href: ROUTES.brackets, label: "Brackets", gameScoped: true },
  { href: ROUTES.freeAgents, label: "Free Agents", gameScoped: true },
  { href: ROUTES.orgs, label: "Orgs", gameScoped: false },
  { href: ROUTES.mentorship, label: "Mentorship", gameScoped: true },
  { href: ROUTES.matches, label: "Match Room", roles: ["handler", "admin"], gameScoped: true },
  { href: ROUTES.rank, label: "My Rank", roles: ["player", "admin"], gameScoped: true },
  { href: ROUTES.rankReview, label: "Review Queue", roles: ["admin"], gameScoped: false },
];

/** Append the current game param to a nav href when the item is game-scoped. */
export function withGame(href: string, game: string | null | undefined): string {
  if (!game) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}game=${game}`;
}
