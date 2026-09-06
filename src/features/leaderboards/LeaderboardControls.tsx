"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BoardKind, FilterOption, SortKey } from "./types";
import styles from "./leaderboards.module.css";

interface Props {
  board: BoardKind;
  sort: SortKey;
  region: string;
  school: string;
  regions: string[];
  schools: FilterOption[];
}

const BOARD_OPTIONS: ReadonlyArray<{ id: BoardKind; label: string }> = [
  { id: "team", label: "Team" },
  { id: "player", label: "Player" },
];

const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: "rating", label: "Rating" },
  { id: "standing", label: "Standing" },
];

/**
 * URL-param driven controls for the leaderboard (shareable + back-button safe):
 * `?board=`, `?sort=`, `?region=`, `?school=`. The two toggles are radiogroups
 * with arrow-key navigation, matching the header GameSwitcher pattern.
 */
export function LeaderboardControls({
  board,
  sort,
  region,
  school,
  regions,
  schools,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className={styles.controls}>
      <Segmented
        label="Board"
        value={board}
        options={BOARD_OPTIONS}
        onSelect={(value) =>
          // region/school option sets differ per board — clear them on switch.
          setParams({ board: value, region: "", school: "" })
        }
      />

      <Segmented
        label="Sort by"
        value={sort}
        options={SORT_OPTIONS}
        onSelect={(value) => setParams({ sort: value })}
      />

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Region</span>
        <select
          className={styles.select}
          value={region}
          onChange={(e) => setParams({ region: e.target.value })}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>School</span>
        <select
          className={styles.select}
          value={school}
          onChange={(e) => setParams({ school: e.target.value })}
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onSelect: (value: T) => void;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onSelect,
}: SegmentedProps<T>) {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = options.findIndex((o) => o.id === value);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (idx + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;

    e.preventDefault();
    onSelect(options[next].id);
    btnRefs.current[next]?.focus();
  };

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div
        className={styles.seg}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => {
          const checked = o.id === value;
          return (
            <button
              key={o.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={styles.segItem}
              onClick={() => onSelect(o.id)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
