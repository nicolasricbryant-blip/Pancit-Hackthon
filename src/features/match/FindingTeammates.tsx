"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GameId } from "@/features/games/config";
import type { LobbyDetail } from "@/features/lobbies/queries";
import styles from "./match.module.css";

interface Props {
  lobby: LobbyDetail;
  game: GameId;
  viewerId: string | null;
  isHost: boolean;
  /** True only when THIS /match search is what turned auto-join on for this
   *  game — see FindMatchLauncher's `startedAutojoinHere`. Gates whether
   *  cancel() also disables the pref; false leaves a pre-existing, deliberate
   *  /profile opt-in completely untouched. */
  ownsAutojoin: boolean;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

function fmtElapsed(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * "Finding Teammates" — the searching screen. Subscribes to Realtime on this
 * lobby's `lobbies` + `lobby_members` rows (same pattern as LobbyActions) and
 * calls `router.refresh()` on any change, which re-runs `getLobby()` on the
 * server and hands this component a fresh `lobby` prop — the orbit re-renders
 * with whoever the backend matchmaker just added, without losing the local
 * elapsed-time state below.
 *
 * Cancelling only closes/leaves THIS lobby by itself — `enable_autojoin` (run
 * by FindMatchLauncher to get here) sets `lobby_autojoin_prefs.enabled = true`
 * permanently, so without also turning that off, the caller keeps getting
 * pulled into random open lobbies by the background matchmaker long after
 * they stopped looking. `cancel()` below turns it back off too, but ONLY when
 * `ownsAutojoin` says this exact search is what turned it on — never a
 * pre-existing, deliberate /profile opt-in.
 */
export function FindingTeammates({
  lobby,
  game,
  viewerId,
  isHost,
  ownsAutojoin,
}: Props) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-${lobby.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_members",
          filter: `lobby_id=eq.${lobby.id}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `id=eq.${lobby.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby.id, router]);

  const filled = lobby.activeCount + lobby.pendingCount;
  const done = filled >= lobby.slotsTotal;
  const unavailable = lobby.status === "closed" || lobby.status === "expired";

  useEffect(() => {
    if (done && !unavailable) {
      router.push(`/lobbies/${lobby.id}?game=${game}`);
    }
  }, [done, unavailable, lobby.id, game, router]);

  async function cancel() {
    if (!viewerId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: leaveErr } = isHost
      ? await supabase
          .from("lobbies")
          .update({ status: "closed" })
          .eq("id", lobby.id)
      : await supabase
          .from("lobby_members")
          .delete()
          .eq("lobby_id", lobby.id)
          .eq("profile_id", viewerId);

    if (leaveErr) {
      setBusy(false);
      setError(leaveErr.message);
      return;
    }

    if (ownsAutojoin) {
      // Same owner-scoped write AutoJoinControl.turnOff performs on /profile.
      // `.update().eq()` returns `error: null` even when zero rows matched, so
      // verify a row actually came back (Commit 1's rule) rather than assume
      // the background search actually stopped.
      const { data, error: prefErr } = await supabase
        .from("lobby_autojoin_prefs")
        .update({ enabled: false })
        .eq("profile_id", viewerId)
        .eq("game_id", lobby.game)
        .select("profile_id")
        .maybeSingle();
      if (prefErr || !data) {
        setBusy(false);
        setError(
          prefErr?.message ??
            "Left the lobby, but couldn't turn off auto-join — turn it off from Profile.",
        );
        return;
      }
    }

    setBusy(false);
    router.push(`/match?game=${game}`);
  }

  if (unavailable) {
    return (
      <div className={styles.searchWrap}>
        <p className={styles.searchTitle}>Lobby no longer available</p>
        <p className={styles.searchSub}>
          The host closed this search, or it expired.
        </p>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => router.push(`/match?game=${game}`)}
        >
          Search again
        </button>
      </div>
    );
  }

  const slots = Array.from({ length: lobby.slotsTotal }, (_, i) => lobby.members[i] ?? null);
  const radius = 108;
  const center = radius + 40;

  return (
    <div className={styles.searchWrap}>
      <p className={styles.searchTitle}>Finding Teammates</p>
      <p className={styles.searchSub}>Matching players based on preferences…</p>

      <div
        className={styles.orbit}
        style={{ width: center * 2, height: center * 2 }}
      >
        <span className={styles.orbitRingOuter} aria-hidden />
        <span className={styles.orbitRingInner} aria-hidden />
        {slots.map((member, i) => {
          const angle = (i / slots.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.round(Math.cos(angle) * radius);
          const y = Math.round(Math.sin(angle) * radius);
          return (
            <span
              key={member?.id ?? `open-${i}`}
              className={styles.orbitSlot}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              data-pending={member?.state === "pending" || undefined}
              title={member?.name}
            >
              {member ? (
                member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className={styles.orbitAvatarImg}
                  />
                ) : (
                  <span className={styles.orbitAvatarMono}>
                    {initials(member.name)}
                  </span>
                )
              ) : (
                <span className={styles.orbitEmpty} aria-hidden />
              )}
            </span>
          );
        })}
      </div>

      <p className={styles.timer}>{fmtElapsed(elapsed)}</p>
      <p className={styles.status}>
        {filled}/{lobby.slotsTotal} found · Searching…
      </p>

      <button
        type="button"
        className={styles.cancelBtn}
        onClick={cancel}
        disabled={busy}
      >
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
