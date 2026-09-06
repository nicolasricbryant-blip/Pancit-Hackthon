"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isGameId } from "@/features/games/config";
import { EVENT_KINDS, type EventKind } from "./types";

export interface CreateEventState {
  error: string | null;
}

/** `"EVT-" + 6 random A–Z0–9`. */
function genCheckinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EVT-${out}`;
}

/**
 * Create an event. `host_profile_id` is forced to the authed user (matches the
 * RLS insert check). On success redirects to the new detail page; on validation
 * or DB failure returns an error string for `useActionState`.
 */
export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const profile = await requireProfile("/events/new");

  const title = String(formData.get("title") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const isPhysical = formData.get("is_physical") === "on";
  const gameRaw = String(formData.get("game_id") ?? "");
  const hostOrg = String(formData.get("host_org") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  if (!(EVENT_KINDS as string[]).includes(kindRaw)) {
    return { error: "Pick an event type." };
  }
  if (!startsAt) return { error: "Start date and time is required." };
  if (endsAt && endsAt < startsAt) {
    return { error: "End time can't be before the start." };
  }
  if (isPhysical && !venue) return { error: "Physical events need a venue." };
  if (isPhysical && !region) return { error: "Physical events need a region." };

  let capacity: number | null = null;
  if (capacityRaw) {
    const n = Number(capacityRaw);
    if (!Number.isInteger(n) || n < 1) {
      return { error: "Capacity must be a whole number above 0." };
    }
    capacity = n;
  }

  const kind = kindRaw as EventKind;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      kind,
      is_physical: isPhysical,
      game_id: isGameId(gameRaw) ? gameRaw : null,
      host_profile_id: profile.id,
      host_org: hostOrg || null,
      school_id: isPhysical && schoolId ? schoolId : null,
      region: isPhysical ? region : null,
      venue: isPhysical ? venue : null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      capacity,
      description: description || null,
      checkin_code: genCheckinCode(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the event." };
  }

  redirect(`/events/${data.id}`);
}
