import Link from "next/link";
import type { CSSProperties } from "react";
import type { GameConfig } from "@/features/games/config";
import styles from "@/app/profile/profile.module.css";

export type SlotStatus = "verified" | "pending" | "rejected" | "unverified";

interface Slot {
  game: GameConfig;
  status: SlotStatus;
}

type SlotVars = CSSProperties & { "--slot-hue"?: string };

/** Compact "verify a game" card row — the top-level summary above the detailed
 * per-game tab below. Tap a slot to (re)submit a rank for that game. */
export function GameSlotRow({ slots }: { slots: Slot[] }) {
  return (
    <div className={styles.slotRow}>
      {slots.map(({ game, status }) => {
        const style: SlotVars = { "--slot-hue": `var(${game.hueToken})` };
        return (
          <Link
            key={game.id}
            href={`/rank/submit?game=${game.id}`}
            className={styles.slot}
            style={style}
          >
            <span className={styles.slotIcon} data-status={status}>
              {status === "verified" ? (
                <CheckGlyph />
              ) : (
                game.label.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className={styles.slotLabel}>{game.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
