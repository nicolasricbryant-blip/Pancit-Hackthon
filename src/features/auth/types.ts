import type { Tables } from "@/lib/db/types";
import type { Role } from "@/config/nav";

/** Full `profiles` row as stored in the DB. */
export type Profile = Tables<"profiles">;

/** `schools` row. */
export type School = Tables<"schools">;

export type { Role };

/** The three account roles a user can pick at sign-up / in settings. */
export const ALL_ROLES: Role[] = ["player", "handler", "admin"];

/**
 * Sign-up / onboarding role choice. `both` = player-captain → roles
 * `['player','handler']`. `admin` is never self-assigned.
 */
export type RoleChoice = "player" | "handler" | "both";

export function rolesFromChoice(choice: RoleChoice): Role[] {
  if (choice === "both") return ["player", "handler"];
  return [choice];
}

export function choiceFromRoles(roles: string[] | null | undefined): RoleChoice {
  const has = (r: string) => (roles ?? []).includes(r);
  if (has("player") && has("handler")) return "both";
  if (has("handler")) return "handler";
  return "player";
}
