"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GameConfig } from "@/features/games/config";
import styles from "@/app/profile/profile.module.css";

/**
 * Per-game main-role multi-select. Persists to `game_profiles.main_roles`
 * on every toggle (owner INSERT/UPDATE allowed by RLS). The lobby matchmaker
 * only places a player whose main_roles overlaps a lobby's needed_roles, so
 * this is a prerequisite for auto-join.
 */
export function MainRolePicker({
  game,
  initial,
  userId,
}: {
  game: GameConfig;
  initial: string[];
  userId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function toggle(role: string) {
    const next = new Set(selected);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    setSelected(next);
    setErr(null);
    setSaved(false);
    setStatus("saving");

    const supabase = createClient();
    const { error } = await supabase.from("game_profiles").upsert(
      {
        profile_id: userId,
        game_id: game.id,
        main_roles: [...next],
      },
      { onConflict: "profile_id,game_id" },
    );

    setStatus("idle");
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    if (tickTimer.current) clearTimeout(tickTimer.current);
    tickTimer.current = setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  return (
    <fieldset className={styles.roleFieldset} disabled={status === "saving"}>
      <legend className={styles.roleLegend}>Main role</legend>

      <div className={styles.roleChips}>
        {game.roles.map((role) => {
          const on = selected.has(role);
          const style: CSSProperties | undefined = on
            ? {
                background: `var(${game.hueToken}-dim)`,
                color: `var(${game.hueToken})`,
                borderColor: `var(${game.hueToken})`,
              }
            : undefined;
          return (
            <button
              key={role}
              type="button"
              className={`${styles.roleChip} ${on ? styles["roleChip--on"] : ""}`}
              style={style}
              aria-pressed={on}
              onClick={() => toggle(role)}
            >
              {role}
            </button>
          );
        })}
      </div>

      <p className={styles.ctrlStatus} aria-live="polite">
        {saved && (
          <span className={styles.savedTick}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 6.5l2.5 2.5 4.5-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Saved
          </span>
        )}
      </p>

      {err && (
        <p className={styles.ctrlErr} role="alert">
          {err}
        </p>
      )}
    </fieldset>
  );
}
