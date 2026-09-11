"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidRankRange, type GameConfig } from "@/features/games/config";
import styles from "@/app/profile/profile.module.css";

export interface AutoJoinPref {
  enabled: boolean;
  rank_min: string | null;
  rank_max: string | null;
  modes: string[];
  mic_ok: boolean;
}

const MODE_OPTS: { value: string; label: string }[] = [
  { value: "ranked", label: "Ranked" },
  { value: "casual", label: "Casual" },
  { value: "scrim_warmup", label: "Scrim warm-up" },
];
const MODE_LABEL: Record<string, string> = Object.fromEntries(
  MODE_OPTS.map((m) => [m.value, m.label]),
);

/**
 * Auto-join toggle + settings. OFF→ON opens an inline settings block and calls
 * the `enable_autojoin` RPC (upserts the prefs row, back-scans open lobbies).
 * ON→OFF flips `enabled` to false but keeps the saved rank/mode/mic values.
 * Requires at least one main role — the matchmaker needs it to place the player.
 */
export function AutoJoinControl({
  game,
  initialPref,
  hasRole,
  userId,
}: {
  game: GameConfig;
  initialPref: AutoJoinPref | null;
  hasRole: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialPref?.enabled ?? false);
  const [rankMin, setRankMin] = useState<string | null>(
    initialPref?.rank_min ?? null,
  );
  const [rankMax, setRankMax] = useState<string | null>(
    initialPref?.rank_max ?? null,
  );
  const [modes, setModes] = useState<string[]>(
    initialPref?.modes?.length ? initialPref.modes : ["ranked"],
  );
  const [micOk, setMicOk] = useState(initialPref?.mic_ok ?? true);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<"matched" | "waiting" | null>(null);

  const saving = status === "saving";
  const switchOn = enabled || editing;
  const showSettings = hasRole && editing;

  function onSwitch() {
    if (!hasRole || saving) return;
    setErr(null);
    setNote(null);
    if (enabled) void turnOff();
    else setEditing((v) => !v);
  }

  function toggleMode(value: string) {
    setModes((cur) =>
      cur.includes(value) ? cur.filter((m) => m !== value) : [...cur, value],
    );
  }

  async function turnOn() {
    if (modes.length === 0) {
      setErr("Pick at least one mode.");
      return;
    }
    if (!isValidRankRange(game.rankTiers, rankMin, rankMax)) {
      setErr("Rank min can't be higher than rank max.");
      return;
    }
    setErr(null);
    setNote(null);
    setStatus("saving");

    const supabase = createClient();
    const { data, error } = await supabase.rpc("enable_autojoin", {
      p_game: game.id,
      p_rank_min: rankMin as string,
      p_rank_max: rankMax as string,
      p_modes: modes,
      p_mic_ok: micOk,
    });

    setStatus("idle");
    if (error) {
      setErr(error.message);
      return;
    }
    setEnabled(true);
    setEditing(false);
    setNote(typeof data === "number" && data > 0 ? "matched" : "waiting");
    router.refresh();
  }

  async function turnOff() {
    setStatus("saving");
    const supabase = createClient();
    // `.update().eq()` returns `error: null` even when zero rows matched (no
    // prefs row exists yet for this game). Verify a row actually came back
    // before flipping local state to off, or the switch lies about what's
    // actually stored.
    const { data, error } = await supabase
      .from("lobby_autojoin_prefs")
      .update({ enabled: false })
      .eq("profile_id", userId)
      .eq("game_id", game.id)
      .select("profile_id")
      .maybeSingle();

    setStatus("idle");
    if (error) {
      setErr(error.message);
      return;
    }
    if (!data) {
      setErr("Nothing to turn off — no auto-join preference was saved yet.");
      return;
    }
    setEnabled(false);
    setEditing(false);
    router.refresh();
  }

  const rangeText =
    !rankMin && !rankMax
      ? "Any rank"
      : rankMin && rankMax
        ? `${rankMin}–${rankMax}`
        : rankMin
          ? `${rankMin}+`
          : `Up to ${rankMax}`;
  const summary = `${modes
    .map((m) => MODE_LABEL[m] ?? m)
    .join(", ")} · ${rangeText} · ${micOk ? "mic ok" : "no mic"}`;

  return (
    <div className={styles.ajWrap}>
      <div className={styles.ajRow}>
        <button
          type="button"
          role="switch"
          aria-checked={switchOn}
          aria-label="Auto-join lobbies"
          className={`${styles.ajSwitch} ${
            switchOn ? styles["ajSwitch--on"] : ""
          }`}
          onClick={onSwitch}
          disabled={!hasRole || saving}
        >
          <span className={styles.ajSwitchThumb} aria-hidden />
        </button>
        <span className={styles.ajLabel}>Auto-join lobbies</span>
      </div>

      {!hasRole && <p className={styles.ajHint}>Pick a main role first.</p>}

      {hasRole && enabled && !editing && (
        <div className={styles.ajSummaryRow}>
          <span className={styles.ajSummary}>{summary}</span>
          <button
            type="button"
            className={styles.ajEdit}
            onClick={() => {
              setEditing(true);
              setNote(null);
            }}
          >
            Edit
          </button>
        </div>
      )}

      {showSettings && (
        <div className={styles.ajSettings}>
          <div className={styles.ajField}>
            <label
              className={styles.ajFieldLabel}
              htmlFor={`${game.id}-aj-rankmin`}
            >
              Rank min
            </label>
            <select
              id={`${game.id}-aj-rankmin`}
              className={styles.ajSelect}
              value={rankMin ?? ""}
              onChange={(e) => setRankMin(e.target.value || null)}
              disabled={saving}
            >
              <option value="">Any</option>
              {game.rankTiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.ajField}>
            <label
              className={styles.ajFieldLabel}
              htmlFor={`${game.id}-aj-rankmax`}
            >
              Rank max
            </label>
            <select
              id={`${game.id}-aj-rankmax`}
              className={styles.ajSelect}
              value={rankMax ?? ""}
              onChange={(e) => setRankMax(e.target.value || null)}
              disabled={saving}
            >
              <option value="">Any</option>
              {game.rankTiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.ajModes} disabled={saving}>
            <legend className={styles.ajFieldLabel}>Modes</legend>
            {MODE_OPTS.map((m) => (
              <label key={m.value} className={styles.ajCheckRow}>
                <input
                  type="checkbox"
                  checked={modes.includes(m.value)}
                  onChange={() => toggleMode(m.value)}
                />
                {m.label}
              </label>
            ))}
          </fieldset>

          <label className={styles.ajCheckRow}>
            <input
              type="checkbox"
              checked={micOk}
              onChange={(e) => setMicOk(e.target.checked)}
              disabled={saving}
            />
            OK with mic-required lobbies
          </label>

          <div className={styles.ajActions}>
            <button
              type="button"
              className={styles.ajBtn}
              onClick={turnOn}
              disabled={saving}
            >
              {saving ? "Saving…" : enabled ? "Save" : "Turn on"}
            </button>
            <button
              type="button"
              className={styles["ajBtn--ghost"]}
              onClick={() => {
                setEditing(false);
                setErr(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className={styles.ajNote} aria-live="polite">
        {note === "matched" && (
          <>
            Matched into a lobby —{" "}
            <Link className={styles.ajNoteLink} href={`/lobbies?game=${game.id}`}>
              see Lobbies
            </Link>
          </>
        )}
        {note === "waiting" &&
          "Auto-join on — you'll be matched when a lobby needs your role."}
      </p>

      {err && (
        <p className={styles.ctrlErr} role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
