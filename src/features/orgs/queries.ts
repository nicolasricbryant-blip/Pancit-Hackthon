import { createClient } from "@/lib/supabase/server";
import {
  coerceOrgKind,
  isOrgRole,
  parseLinks,
  type OrgListItem,
  type OrgMemberView,
  type OrgProfile,
  type OrgTeamLite,
  type SchoolLite,
} from "./types";

/** First element of a Supabase nested relation, or null. */
function one<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Count of teams per org id, across the whole `teams` table. */
async function teamCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("org_id")
    .not("org_id", "is", null);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.org_id) continue;
    counts.set(row.org_id, (counts.get(row.org_id) ?? 0) + 1);
  }
  return counts;
}

/** Every org, newest first, with its team count. */
export async function listOrgs(): Promise<OrgListItem[]> {
  const supabase = await createClient();
  const [{ data, error }, counts] = await Promise.all([
    supabase
      .from("orgs")
      .select(
        "id,slug,name,short_name,kind,region,logo_url,verified,created_at",
      )
      .order("created_at", { ascending: false }),
    teamCounts(),
  ]);

  if (error || !data) return [];

  return data.map((o): OrgListItem => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    short_name: o.short_name,
    kind: coerceOrgKind(o.kind),
    region: o.region,
    logo_url: o.logo_url,
    verified: o.verified,
    teamCount: counts.get(o.id) ?? 0,
  }));
}

/** Full org profile — members + teams. Null when the slug doesn't exist. */
export async function getOrgBySlug(slug: string): Promise<OrgProfile | null> {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from("orgs")
    .select(
      "id,slug,name,short_name,kind,region,logo_url,bio,verified,owner_id,links,schools(id,name,short_name)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !org) return null;

  const [{ data: memberRows }, { data: teamRows }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id,role,title,profile_id,profiles(handle,display_name)")
      .eq("org_id", org.id)
      .order("joined_at"),
    supabase
      .from("teams")
      .select("id,name,tag,region")
      .eq("org_id", org.id)
      .order("name"),
  ]);

  const school = one(org.schools);

  const members: OrgMemberView[] = (memberRows ?? []).map((m): OrgMemberView => {
    const p = one(m.profiles);
    return {
      id: m.id,
      profileId: m.profile_id,
      role: isOrgRole(m.role) ? m.role : "member",
      title: m.title,
      displayName: p?.display_name ?? null,
      handle: p?.handle ?? null,
    };
  });

  const teams: OrgTeamLite[] = (teamRows ?? []).map((t): OrgTeamLite => ({
    id: t.id,
    name: t.name,
    tag: t.tag,
    region: t.region,
  }));

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    short_name: org.short_name,
    kind: coerceOrgKind(org.kind),
    region: org.region,
    logo_url: org.logo_url,
    bio: org.bio,
    verified: org.verified,
    ownerId: org.owner_id,
    school: school
      ? { id: school.id, name: school.name, short_name: school.short_name }
      : null,
    links: parseLinks(org.links),
    members,
    teams,
  };
}

/** Distinct, sorted region labels across a set of orgs (browse filter). */
export function regionsOf(orgs: OrgListItem[]): string[] {
  const set = new Set<string>();
  for (const o of orgs) if (o.region) set.add(o.region);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Every school, for the create / manage pickers. */
export async function listSchools(): Promise<SchoolLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id,name,short_name,region")
    .order("name");
  return data ?? [];
}

/**
 * Whether `userId` may manage `org` — its owner, or an owner/admin member row.
 * `members` is the already-loaded profile member list.
 */
export function canManageOrg(
  userId: string | null | undefined,
  org: Pick<OrgProfile, "ownerId" | "members">,
): boolean {
  if (!userId) return false;
  if (org.ownerId === userId) return true;
  return org.members.some(
    (m) => m.profileId === userId && (m.role === "owner" || m.role === "admin"),
  );
}
