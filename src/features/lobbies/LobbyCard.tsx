"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LobbyListRow, LobbyMode } from "./queries";
import { LobbyCrest } from "./LobbyCrest";
import styles from "@/app/lobbies/lobbies.module.css";

const MODE_LABEL: Record<LobbyMode, string> = {
  ranked: "Ranked",
  casual: "Casual",
  scrim_warmup: "Scrim warm-up",
};

type ModeFilter = LobbyMode | "all";
const MODE_FILTERS: ModeFilter[] = ["all", "ranked", "casual", "scrim_warmup"];

/** True when a lobby's open roles could seat a player with `viewerRoles`. */
function fitsRole(neededRoles: string[], viewerRoles: string[]): boolean {
  if (neededRoles.length === 0) return true;
  if (neededRoles.includes("Flex")) return true;
  if (viewerRoles.includes("Flex")) return true;
  return neededRoles.some((r) => viewerRoles.includes(r));
}

interface FeedProps {
  rows: LobbyListRow[];
  label: string;
  viewerRoles: string[];
}

/**
 * Client feed island: the page fetches every open lobby for the game, this
 * narrows the list by mode and an optional "fits my role" toggle. Pure
 * client-side filtering over the server rows — no refetch.
 */
export function LobbyFeed({ rows, label, viewerRoles }: FeedProps) {
  const [mode, setMode] = useState<ModeFilter>("all");
  const [onlyFits, setOnlyFits] = useState(false);
  const canRoleFilter = viewerRoles.length > 0;

  const results = useMemo(() => {
    return rows.filter((r) => {
      if (mode !== "all" && r.mode !== mode) return false;
      if (onlyFits && canRoleFilter && !fitsRole(r.neededRoles, viewerRoles)) {
        return false;
      }
      return true;
    });
  }, [rows, mode, onlyFits, canRoleFilter, viewerRoles]);

  return (
    <>
      <div className={styles.filters}>
        <div
          className={styles.chipScroll}
          role="group"
          aria-label="Filter lobbies by mode"
        >
          {MODE_FILTERS.map((m) => (
            <button
              key={m}
              type="button"
              className={styles.chipToggle}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "all" ? "All modes" : MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {canRoleFilter && (
          <button
            type="button"
            className={styles.chipToggle}
            aria-pressed={onlyFits}
            onClick={() => setOnlyFits((v) => !v)}
          >
            Fits my role
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className={styles.empty}>
          {rows.length === 0
            ? `No open lobbies in ${label}. Host one.`
            : "No lobbies match these filters."}
        </p>
      ) : (
        <ul className={styles.grid}>
          {results.map((r) => (
            <li key={r.id}>
              <LobbyCard row={r} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MicGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="6"
        y="1.5"
        width="4"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5M5.5 14.5h5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type HueVars = React.CSSProperties & Record<`--${string}`, string>;

export function LobbyCard({ row }: { row: LobbyListRow }) {
  const full = row.status === "full";

  const rankText =
    row.rankMin == null && row.rankMax == null
      ? "Any rank"
      : `${row.rankMin ?? "any"}–${row.rankMax ?? "any"}`;

  const openRoles = row.neededRoles.filter((r) => !row.filledRoles.includes(r));
  const pct = row.slotsTotal
    ? Math.min(100, Math.round((row.activeCount / row.slotsTotal) * 100))
    : 0;

  const hueStyle: HueVars = {
    "--lobby-hue": `var(--game-${row.game})`,
    "--lobby-hue-dim": `var(--game-${row.game}-dim)`,
  };

  return (
    <Link
      href={`/lobbies/${row.id}`}
      className={styles.card}
      style={hueStyle}
      data-full={full || undefined}
    >
      <div className={styles.cardHead}>
        <LobbyCrest name={row.host.name} />
        <div className={styles.cardWho}>
          <span className={styles.cardHost}>{row.host.name}</span>
          {row.host.handle && (
            <span className={styles.cardHandle}>@{row.host.handle}</span>
          )}
        </div>
        <div className={styles.cardTags}>
          <span className={styles.modeBadge}>{MODE_LABEL[row.mode]}</span>
          {full && <span className={styles.fullTag}>Full</span>}
        </div>
      </div>

      <h3 className={styles.cardTitle}>{row.title}</h3>

      <div className={styles.cardMeta}>
        <span className={styles.rank}>{rankText}</span>
        {row.micRequired && (
          <span
            className={styles.mic}
            aria-label="Mic required"
            title="Mic required"
          >
            <MicGlyph />
          </span>
        )}
        {row.autoFill && <span className={styles.autoTag}>auto-fill</span>}
      </div>

      <div className={styles.fill}>
        <span className={styles.fillCount}>
          {row.activeCount}/{row.slotsTotal}
        </span>
        <span className={styles.fillBar} aria-hidden>
          <span className={styles.fillBarOn} style={{ width: `${pct}%` }} />
        </span>
      </div>

      <div className={styles.roleChips}>
        {row.neededRoles.length === 0 ? (
          <span className={styles.roleChipMuted}>any role</span>
        ) : openRoles.length === 0 ? (
          <span className={styles.roleChipMuted}>roles filled</span>
        ) : (
          openRoles.map((r) => (
            <span key={r} className={styles.roleChip}>
              {r}
            </span>
          ))
        )}
      </div>
    </Link>
  );
}
