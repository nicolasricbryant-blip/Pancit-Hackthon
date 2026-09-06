import type { Tables } from "@/lib/db/types";

/** Raw DB rows. */
export type OrgRow = Tables<"orgs">;
export type OrgMemberRow = Tables<"org_members">;

/** Result contract shared by every orgs server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/* --------------------------------------------------------------------------- */
/* Org kind                                                                     */

/** Mirrors the `orgs.kind` CHECK constraint, ordered for the picker. */
export const ORG_KINDS = [
  "varsity",
  "community",
  "collegiate_league",
  "content",
] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export function isOrgKind(v: string): v is OrgKind {
  return (ORG_KINDS as readonly string[]).includes(v);
}

/** Short human label for an org kind. */
export const KIND_LABEL: Record<OrgKind, string> = {
  varsity: "Varsity program",
  community: "Community org",
  collegiate_league: "Collegiate league",
  content: "Content org",
};

/** Coerce an unknown DB string to a known kind, defaulting to `varsity`. */
export function coerceOrgKind(v: string | null | undefined): OrgKind {
  return v && isOrgKind(v) ? v : "varsity";
}

/* --------------------------------------------------------------------------- */
/* Org member role                                                              */

/** Mirrors the `org_members.role` CHECK constraint, ordered. */
export const ORG_ROLES = ["owner", "admin", "manager", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(v: string): v is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(v);
}

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

/** Roles that may edit the org and manage members. */
export function isAdminRole(role: string): boolean {
  return role === "owner" || role === "admin";
}

/* --------------------------------------------------------------------------- */
/* Links                                                                        */

/** Known keys in the `orgs.links` jsonb, ordered for rendering. */
export const LINK_KEYS = [
  "website",
  "discord",
  "facebook",
  "x",
  "youtube",
] as const;
export type LinkKey = (typeof LINK_KEYS)[number];

export const LINK_LABEL: Record<LinkKey, string> = {
  website: "Website",
  discord: "Discord",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
};

export type OrgLinks = Partial<Record<LinkKey, string>>;

/**
 * Read a raw `links` jsonb value into a typed object, keeping only known keys
 * with non-empty string values.
 */
export function parseLinks(raw: unknown): OrgLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: OrgLinks = {};
  for (const key of LINK_KEYS) {
    const v = src[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

/**
 * Assemble a `links` object from form fields, dropping blanks and prefixing a
 * scheme where the value looks like a bare host.
 */
export function assembleLinks(fields: Record<LinkKey, string>): OrgLinks {
  const out: OrgLinks = {};
  for (const key of LINK_KEYS) {
    const v = fields[key]?.trim();
    if (!v) continue;
    out[key] = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* Slug                                                                         */

/** Valid stored slug: starts alphanumeric, 2–39 chars, lowercase + dashes. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}$/;

export function isValidSlug(v: string): boolean {
  return SLUG_RE.test(v);
}

/** Suggest a slug from a name: lowercase, non-alphanumerics to dashes, trimmed. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 39);
}

/* --------------------------------------------------------------------------- */
/* View models                                                                  */

/** School as needed by pickers / cards. */
export interface SchoolLite {
  id: string;
  name: string;
  short_name: string | null;
  region: string | null;
}

/** One row in the `/orgs` browse grid. */
export interface OrgListItem {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  kind: OrgKind;
  region: string | null;
  logo_url: string | null;
  verified: boolean;
  teamCount: number;
}

/** A member row joined to its profile. */
export interface OrgMemberView {
  id: string;
  profileId: string;
  role: OrgRole;
  title: string | null;
  displayName: string | null;
  handle: string | null;
}

/** A team owned by the org, for the profile's Teams section. */
export interface OrgTeamLite {
  id: string;
  name: string;
  tag: string | null;
  region: string | null;
}

/** Everything the org profile page renders. */
export interface OrgProfile {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  kind: OrgKind;
  region: string | null;
  logo_url: string | null;
  bio: string | null;
  verified: boolean;
  ownerId: string | null;
  school: { id: string; name: string; short_name: string | null } | null;
  links: OrgLinks;
  members: OrgMemberView[];
  teams: OrgTeamLite[];
}

/** A monogram from an org name — up to two initials. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
