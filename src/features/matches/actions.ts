"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, TablesUpdate } from "@/lib/db/types";
import type { MatchRow } from "./types";
import { computeWinner, mapsFromCommaList } from "./types";

/**
 * Match Room mutations. Every action re-checks that the caller is a handler of
 * team_a or team_b before writing — the same rule RLS enforces
 * (scrim_matches_handler_write), so a bypass attempt fails twice.
 *
 * IMPORTANT: these do NOT touch ratings / reliability. Advancing a result only
 * flips `status` and sets `winner`; a later system job recomputes ratings.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

type DB = SupabaseClient<Database>;

interface Ctx {
  supabase: DB;
  user: User;
  match: MatchRow;
  /** Side the caller handles. "both" when they handle team_a and team_b. */
  side: "a" | "b" | "both";
}

/** Load the match and assert the caller handles at least one of its teams. */
async function loadCtx(matchId: string): Promise<Ctx | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to manage this match." };

  const { data: match } = await supabase
    .from("scrim_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { error: "Match not found." };

  const { data: teams } = await supabase
    .from("teams")
    .select("id, handler_id")
    .in("id", [match.team_a, match.team_b]);

  const handlesA = (teams ?? []).some((t) => t.id === match.team_a && t.handler_id === user.id);
  const handlesB = (teams ?? []).some((t) => t.id === match.team_b && t.handler_id === user.id);
  if (!handlesA && !handlesB) {
    return { error: "Only a handler of either team can do that." };
  }

  const side: Ctx["side"] = handlesA && handlesB ? "both" : handlesA ? "a" : "b";
  return { supabase, user, match: match as MatchRow, side };
}

function bothConfirmedAfter(
  match: MatchRow,
  side: Ctx["side"],
): { a: boolean; b: boolean } {
  return {
    a: side === "a" || side === "both" ? true : match.team_a_confirmed,
    b: side === "b" || side === "both" ? true : match.team_b_confirmed,
  };
}

/* -------------------------------------------------------------------------- */
/* Edit the agreed ruleset (only while status = 'booked')                      */
/* -------------------------------------------------------------------------- */

export async function updateRulesetAction(
  matchId: string,
  input: { mode: string; mapsCsv: string; series: string; server: string },
): Promise<ActionResult> {
  const ctx = await loadCtx(matchId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, match } = ctx;

  if (match.status !== "booked") {
    return { ok: false, error: "Ruleset is locked once the match leaves 'booked'." };
  }
  if (match.team_a_confirmed && match.team_b_confirmed) {
    return { ok: false, error: "Both teams have locked the ruleset." };
  }

  const ruleset: TablesUpdate<"scrim_matches">["ruleset"] = {
    mode: input.mode.trim(),
    maps: mapsFromCommaList(input.mapsCsv),
    series: input.series.trim(),
    server: input.server.trim(),
  };

  const { error } = await supabase
    .from("scrim_matches")
    .update({ ruleset })
    .eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${matchId}`);
  return { ok: true, message: "Ruleset saved." };
}

/* -------------------------------------------------------------------------- */
/* Report a result (status 'booked' -> 'reported', or re-report from 'disputed')*/
/* -------------------------------------------------------------------------- */

export async function reportResultAction(
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ActionResult> {
  const ctx = await loadCtx(matchId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, user, match, side } = ctx;

  if (match.status !== "booked" && match.status !== "disputed") {
    return { ok: false, error: "This match already has a reported result." };
  }
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return { ok: false, error: "Scores must be whole numbers, 0 or higher." };
  }
  if (scoreA === 0 && scoreB === 0) {
    return { ok: false, error: "Enter the series score before reporting." };
  }

  const patch: TablesUpdate<"scrim_matches"> = {
    status: "reported",
    score_a: scoreA,
    score_b: scoreB,
    reported_by: user.id,
    team_a_confirmed: side === "a" || side === "both",
    team_b_confirmed: side === "b" || side === "both",
    winner: null,
  };

  const { error } = await supabase.from("scrim_matches").update(patch).eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  return { ok: true, message: "Result reported. Waiting for the other team to confirm." };
}

/* -------------------------------------------------------------------------- */
/* Confirm a reported result — dual confirmation gate                          */
/* -------------------------------------------------------------------------- */

export async function confirmResultAction(matchId: string): Promise<ActionResult> {
  const ctx = await loadCtx(matchId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, match, side } = ctx;

  if (match.status !== "reported") {
    return { ok: false, error: "There is no reported result to confirm." };
  }
  if (match.score_a == null || match.score_b == null) {
    return { ok: false, error: "The reported score is incomplete — ask for a re-report." };
  }

  const next = bothConfirmedAfter(match, side);
  const patch: TablesUpdate<"scrim_matches"> = {
    team_a_confirmed: next.a,
    team_b_confirmed: next.b,
  };

  if (next.a && next.b) {
    const winner = computeWinner(match.team_a, match.team_b, match.score_a, match.score_b);
    if (winner) {
      patch.status = "confirmed";
      patch.winner = winner;
    } else {
      // Tie on full confirmation — no winner. Flip to 'disputed' so a handler
      // can re-report; there is no auto-resolution this milestone.
      patch.status = "disputed";
      patch.winner = null;
    }
  }

  const { error } = await supabase.from("scrim_matches").update(patch).eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");

  if (next.a && next.b) {
    const winner = computeWinner(match.team_a, match.team_b, match.score_a, match.score_b);
    return winner
      ? { ok: true, message: "Result confirmed." }
      : { ok: true, message: "Scores are tied — result moved to disputed. Re-report the correct score." };
  }
  return { ok: true, message: "Your side is confirmed. Waiting on the other team." };
}

/* -------------------------------------------------------------------------- */
/* Dispute a reported result (status flip only — no resolution flow)          */
/* -------------------------------------------------------------------------- */

export async function disputeResultAction(matchId: string): Promise<ActionResult> {
  const ctx = await loadCtx(matchId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, match } = ctx;

  if (match.status !== "reported") {
    return { ok: false, error: "Only a reported result can be disputed." };
  }

  const { error } = await supabase
    .from("scrim_matches")
    .update({ status: "disputed" })
    .eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  return { ok: true, message: "Result disputed. A handler can re-report the correct score." };
}
