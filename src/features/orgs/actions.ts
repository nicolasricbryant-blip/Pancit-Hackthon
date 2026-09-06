"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  assembleLinks,
  isAdminRole,
  isOrgKind,
  isOrgRole,
  isValidSlug,
  slugify,
  type ActionResult,
  type LinkKey,
  type OrgKind,
  type OrgLinks,
  type OrgRole,
} from "./types";

/** Resolve the signed-in user id, or null. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Revalidate every page that shows an org's data. */
function revalidateOrg(slug: string): void {
  revalidatePath("/orgs");
  revalidatePath(`/orgs/${slug}`);
  revalidatePath(`/orgs/${slug}/manage`);
}

/**
 * Load an org by slug and confirm `userId` may manage it (owner, or an
 * owner/admin member row).
 */
async function requireOrgManager(
  userId: string,
  slug: string,
): Promise<
  { ok: true; orgId: string; ownerId: string | null } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("orgs")
    .select("id,owner_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return { ok: false, error: "Org not found." };

  if (org.owner_id === userId) {
    return { ok: true, orgId: org.id, ownerId: org.owner_id };
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("profile_id", userId)
    .maybeSingle();
  if (membership && isAdminRole(membership.role)) {
    return { ok: true, orgId: org.id, ownerId: org.owner_id };
  }

  return { ok: false, error: "Only an org owner or admin can do that." };
}

/** How many `owner`-role member rows the org currently has. */
async function ownerCount(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("role", "owner");
  return data?.length ?? 0;
}

/* --------------------------------------------------------------------------- */
/* Create                                                                       */

export interface CreateOrgInput {
  name: string;
  slug: string;
  shortName: string;
  kind: string;
  schoolId: string | null;
  region: string;
  bio: string;
  links: Record<LinkKey, string>;
}

/**
 * Create an org owned by the current user, seat them as an `owner` member, and
 * redirect to the new profile.
 */
export async function createOrg(
  input: CreateOrgInput,
): Promise<ActionResult | void> {
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in?next=/orgs/new");

  const name = input.name.trim();
  const slug = slugify(input.slug || input.name);
  const shortName = input.shortName.trim();
  const region = input.region.trim();
  const bio = input.bio.trim();
  const kind: OrgKind = isOrgKind(input.kind) ? input.kind : "varsity";
  const links: OrgLinks = assembleLinks(input.links);

  if (name.length < 2) return { ok: false, error: "Org name is too short." };
  if (!isValidSlug(slug)) {
    return {
      ok: false,
      error: "URL must be 2–39 characters: lowercase letters, numbers, dashes.",
    };
  }

  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .insert({
      slug,
      name,
      short_name: shortName || null,
      kind,
      school_id: input.schoolId,
      region: region || null,
      bio: bio || null,
      links,
      owner_id: userId,
    })
    .select("id,slug")
    .single();

  if (orgError || !org) {
    if (orgError?.code === "23505") {
      return { ok: false, error: "That URL is taken." };
    }
    return { ok: false, error: orgError?.message ?? "Could not create org." };
  }

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    profile_id: userId,
    role: "owner",
    title: "Founder",
  });
  if (memberError) return { ok: false, error: memberError.message };

  revalidatePath("/orgs");
  redirect(`/orgs/${org.slug}`);
}

/* --------------------------------------------------------------------------- */
/* Update                                                                       */

export interface UpdateOrgInput {
  slug: string;
  name: string;
  shortName: string;
  kind: string;
  schoolId: string | null;
  region: string;
  bio: string;
  links: Record<LinkKey, string>;
}

/** Edit an org's core fields (not its slug). Owner / admin only. */
export async function updateOrg(input: UpdateOrgInput): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const guard = await requireOrgManager(userId, input.slug);
  if (!guard.ok) return guard;

  const name = input.name.trim();
  const shortName = input.shortName.trim();
  const region = input.region.trim();
  const bio = input.bio.trim();
  const kind: OrgKind = isOrgKind(input.kind) ? input.kind : "varsity";
  const links: OrgLinks = assembleLinks(input.links);

  if (name.length < 2) return { ok: false, error: "Org name is too short." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orgs")
    .update({
      name,
      short_name: shortName || null,
      kind,
      school_id: input.schoolId,
      region: region || null,
      bio: bio || null,
      links,
    })
    .eq("id", guard.orgId);

  if (error) return { ok: false, error: error.message };

  revalidateOrg(input.slug);
  return { ok: true };
}

/* --------------------------------------------------------------------------- */
/* Members                                                                      */

/** Add a member by exact profile handle. Owner / admin only. */
export async function addOrgMember(input: {
  slug: string;
  handle: string;
  role: OrgRole;
  title: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const guard = await requireOrgManager(userId, input.slug);
  if (!guard.ok) return guard;

  const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { ok: false, error: "Enter a handle." };
  if (!isOrgRole(input.role)) return { ok: false, error: "Pick a role." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (!profile) return { ok: false, error: `No user with the handle @${handle}.` };

  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", guard.orgId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `@${handle} is already a member.` };
  }

  const { error } = await supabase.from("org_members").insert({
    org_id: guard.orgId,
    profile_id: profile.id,
    role: input.role,
    title: input.title.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidateOrg(input.slug);
  return { ok: true };
}

/** Load a member row with its org, guarding management rights. */
async function memberWithManageRights(
  userId: string,
  memberId: string,
): Promise<
  | { ok: true; orgId: string; slug: string; role: string; profileId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("org_id,role,profile_id,orgs(slug)")
    .eq("id", memberId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Member not found." };

  const org = Array.isArray(data.orgs) ? data.orgs[0] : data.orgs;
  if (!org) return { ok: false, error: "Org not found." };

  const guard = await requireOrgManager(userId, org.slug);
  if (!guard.ok) return guard;

  return {
    ok: true,
    orgId: data.org_id,
    slug: org.slug,
    role: data.role,
    profileId: data.profile_id,
  };
}

/** Change a member's role and/or title. Owner / admin only. */
export async function updateOrgMember(input: {
  memberId: string;
  role: OrgRole;
  title: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };
  if (!isOrgRole(input.role)) return { ok: false, error: "Pick a role." };

  const guard = await memberWithManageRights(userId, input.memberId);
  if (!guard.ok) return guard;

  if (
    guard.role === "owner" &&
    input.role !== "owner" &&
    (await ownerCount(guard.orgId)) <= 1
  ) {
    return {
      ok: false,
      error: "Promote another owner before changing this one's role.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .update({ role: input.role, title: input.title.trim() || null })
    .eq("id", input.memberId);
  if (error) return { ok: false, error: error.message };

  revalidateOrg(guard.slug);
  return { ok: true };
}

/** Remove a member. Owner / admin only; can't drop the last owner. */
export async function removeOrgMember(input: {
  memberId: string;
}): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Sign in again." };

  const guard = await memberWithManageRights(userId, input.memberId);
  if (!guard.ok) return guard;

  if (guard.role === "owner" && (await ownerCount(guard.orgId)) <= 1) {
    return {
      ok: false,
      error: "Promote another owner before removing this one.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("id", input.memberId);
  if (error) return { ok: false, error: error.message };

  revalidateOrg(guard.slug);
  return { ok: true };
}
