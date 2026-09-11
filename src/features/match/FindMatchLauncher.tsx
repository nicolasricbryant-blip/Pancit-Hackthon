"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GameId } from "@/features/games/config";
import type { LobbyMode } from "@/features/lobbies/queries";
import styles from "./match.module.css";

const MODE_OPTIONS: { value: LobbyMode; label: string }[] = [
  { value: "ranked", label: "Ranked" },
  { value: "casual", label: "Casual" },
  { value: "scrim_warmup", label: "Scrim warm-up" },
];

const SQUAD_SIZE = 5;

interface MemberRow {
  lobby_id: string;
  created_at: string;
  lobbies: { game_id: string; status: string } | { game_id: string; status: string }[] | null;
}

function one<T>(v: T[] | T | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

interface Props {
  game: GameId;
  gameLabel: string;
  rankTiers: string[];
  signedIn: boolean;
  hasRole: boolean;
  initialRankMin: string | null;
  initialRankMax: string | null;
  initialMicOk: boolean;
}

/**
 * Pre-search screen: pick a mode / rank band / mic requirement, then
 * "Find Match" runs the real matchmaker — `enable_autojoin` (saves the prefs
 * and back-scans up to 20 open lobbies for a fit) and, if nothing fits yet,
 * hosts a fresh auto-fill lobby so other searchers can be matched into it.
 * Either way the viewer lands on the live searching screen for that lobby.
 */
export function FindMatchLauncher({
  game,
  gameLabel,
  rankTiers,
  signedIn,
  hasRole,
  initialRankMin,
  initialRankMax,
  initialMicOk,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<LobbyMode>("ranked");
  const [rankMin, setRankMin] = useState(initialRankMin ?? "");
  const [rankMax, setRankMax] = useState(initialRankMax ?? "");
  const [micOk, setMicOk] = useState(initialMicOk);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findMatch() {
    setError(null);

    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(`/match?game=${game}`)}`);
      return;
    }
    if (!hasRole) {
      setError("Set a main role for this game in your Profile first.");
      return;
    }

    setSearching(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSearching(false);
      router.push(`/sign-in?next=${encodeURIComponent(`/match?game=${game}`)}`);
      return;
    }

    const { data: matchedCount, error: rpcErr } = await supabase.rpc(
      "enable_autojoin",
      {
        p_game: game,
        p_rank_min: (rankMin || null) as string,
        p_rank_max: (rankMax || null) as string,
        p_modes: [mode],
        p_mic_ok: micOk,
      },
    );

    if (rpcErr) {
      setSearching(false);
      setError(rpcErr.message);
      return;
    }

    if (typeof matchedCount === "number" && matchedCount > 0) {
      const { data: mine } = await supabase
        .from("lobby_members")
        .select("lobby_id, created_at, lobbies(game_id, status)")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const hit = ((mine ?? []) as MemberRow[]).find((m) => {
        const l = one(m.lobbies);
        return l != null && l.game_id === game && (l.status === "open" || l.status === "full");
      });

      if (hit) {
        router.push(`/match/${hit.lobby_id}?game=${game}`);
        return;
      }
    }

    // Nobody fit — host a fresh auto-fill lobby and wait for others.
    const { data: created, error: insErr } = await supabase
      .from("lobbies")
      .insert({
        host_id: user.id,
        game_id: game,
        title: `Looking for a ${gameLabel} squad`,
        mode,
        rank_min: rankMin || null,
        rank_max: rankMax || null,
        slots_total: SQUAD_SIZE,
        needed_roles: [],
        mic_required: !micOk,
        auto_fill: true,
      })
      .select("id")
      .single();

    setSearching(false);
    if (insErr || !created) {
      setError(insErr?.message ?? "Could not start a search. Try again.");
      return;
    }
    router.push(`/match/${created.id}?game=${game}`);
  }

  return (
    <div className={styles.launcherCard}>
      <p className={styles.launcherTitle}>Find Teammates</p>
      <p className={styles.launcherSub}>
        We&apos;ll auto-match you into an open {gameLabel} lobby, or host one
        for others to join.
      </p>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Mode</span>
        <div className={styles.chipRow} role="radiogroup" aria-label="Mode">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              className={styles.chip}
              onClick={() => setMode(m.value)}
              disabled={searching}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.rankRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Rank min</span>
          <select
            className={styles.select}
            value={rankMin}
            onChange={(e) => setRankMin(e.target.value)}
            disabled={searching}
          >
            <option value="">Any</option>
            {rankTiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Rank max</span>
          <select
            className={styles.select}
            value={rankMax}
            onChange={(e) => setRankMax(e.target.value)}
            disabled={searching}
          >
            <option value="">Any</option>
            {rankTiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={styles.micRow}>
        <input
          type="checkbox"
          checked={micOk}
          onChange={(e) => setMicOk(e.target.checked)}
          disabled={searching}
        />
        OK with mic-required lobbies
      </label>

      {!hasRole && signedIn && (
        <p className={styles.hint}>
          Set a main role for {gameLabel} in your{" "}
          <Link href={`/profile`} className={styles.hintLink}>
            Profile
          </Link>{" "}
          before searching — the matchmaker needs it to place you.
        </p>
      )}

      <button
        type="button"
        className={styles.findBtn}
        onClick={findMatch}
        disabled={searching}
      >
        {searching ? "Starting search…" : "Find Match"}
      </button>

      {error && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
