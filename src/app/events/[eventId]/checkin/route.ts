import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /events/:eventId/checkin?code=EVT-XXXXXX
 *
 * For a signed-in attendee whose RSVP is 'going', stamp `checked_in_at = now()`
 * when the code matches the event, then bounce back to the event page. All
 * failure paths redirect back with `?checkin=err` rather than throwing.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await ctx.params;
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const base = new URL(`/events/${eventId}`, request.nextUrl.origin);

  const fail = (reason: string) => {
    base.searchParams.set("checkin", reason);
    return NextResponse.redirect(base);
  };

  if (!code) return fail("err");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const signIn = new URL("/sign-in", request.nextUrl.origin);
    signIn.searchParams.set("next", `/events/${eventId}/checkin?code=${code}`);
    return NextResponse.redirect(signIn);
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, checkin_code")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.checkin_code || event.checkin_code !== code) {
    return fail("err");
  }

  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("id, status, checked_in_at")
    .eq("event_id", eventId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!rsvp || rsvp.status !== "going") return fail("notgoing");

  if (!rsvp.checked_in_at) {
    const { error } = await supabase
      .from("event_rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", rsvp.id);
    if (error) return fail("err");
  }

  base.searchParams.set("checkedin", "1");
  return NextResponse.redirect(base);
}
