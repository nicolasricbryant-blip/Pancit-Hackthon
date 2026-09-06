"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BoardKind, FilterOption, ScopeKind, SortKey } from "./types";
import styles from "./leaderboards.module.css";

interface Props {
  board: BoardKind;
  sort: SortKey;
  scope: ScopeKind;
  region: string;
  school: string;
  regions: string[];
  schools: FilterOption[];
  signedIn: boolean;
  /** Viewer has a region on their profile — enables the Regional option. */
  canRegional: boolean;
  /** Viewer has a school on their profile — enables the My School option. */
  canSchool: boolean;
}

/** One button in a `<Segmented>` radiogroup. `disabled` greys it out + blocks select. */
interface SegOption<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
  /** Native tooltip shown on hover — used to explain a disabled option. */
  title?: string;
}

const BOARD_OPTIONS: ReadonlyArray<SegOption<BoardKind>> = [
  { id: "team", label: "Team" },
  { id: "player", label: "Player" },
];

const SORT_OPTIONS: ReadonlyArray<SegOption<SortKey>> = [
  { id: "rating", label: "Rating" },
  { id: "standing", label: "Standing" },
];

const SCOPE_LABELS: Record<ScopeKind, string> = {
  nationwide: "Nationwide",
  regional: "Regional",
  school: "My School",
};

const SIGNED_OUT_HINT = "Sign in to filter by your region or school";

/**
 * URL-param driven controls for the leaderboard (shareable + back-button safe):
 * `?scope=`, `?board=`, `?sort=`, `?region=`, `?school=`. The toggles are
 * radiogroups with arrow-key navigation, matching the header GameSwitcher
 * pattern. `scope` is the top-level reach; the region/school selects layer over
 * it (region stays pickable under Regional as an override).
 */
export function LeaderboardControls({
  board,
  sort,
  scope,
  region,
  school,
  regions,
  schools,
  signedIn,
  canRegional,
  canSchool,
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

  const scopeOptions: ReadonlyArray<SegOption<ScopeKind>> = [
    { id: "nationwide", label: SCOPE_LABELS.nationwide },
    {
      id: "regional",
      label: SCOPE_LABELS.regional,
      disabled: !canRegional,
      title: canRegional
        ? undefined
        : signedIn
          ? "Add your region in your profile to use this"
          : SIGNED_OUT_HINT,
    },
    {
      id: "school",
      label: SCOPE_LABELS.school,
      disabled: !canSchool,
      title: canSchool
        ? undefined
        : signedIn
          ? "Add your school in your profile to use this"
          : SIGNED_OUT_HINT,
    },
  ];

  // region stays visible (and pickable) under Regional as an override; both
  // selects fall away under My School since the school is fixed to the viewer.
  const showRegion = scope !== "school";
  const showSchool = scope === "nationwide";

  return (
    <div className={styles.controls}>
      <Segmented
        label="Scope"
        value={scope}
        options={scopeOptions}
        onSelect={(value) => setParams({ scope: value })}
      />

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

      {showRegion ? (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            {scope === "regional" ? "Region (override)" : "Region"}
          </span>
          <select
            className={styles.select}
            value={region}
            onChange={(e) => setParams({ region: e.target.value })}
          >
            <option value="">
              {scope === "regional" ? "My region" : "All regions"}
            </option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showSchool ? (
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
      ) : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SegOption<T>>;
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
    // Roving focus moves only across the enabled options.
    const enabled = options
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
    if (enabled.length === 0) return;

    const pos = enabled.indexOf(options.findIndex((o) => o.id === value));
    let nextPos = pos;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      nextPos = (pos + 1) % enabled.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      nextPos = (pos - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") nextPos = 0;
    else if (e.key === "End") nextPos = enabled.length - 1;
    else return;

    e.preventDefault();
    const target = enabled[nextPos];
    onSelect(options[target].id);
    btnRefs.current[target]?.focus();
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
              disabled={o.disabled}
              title={o.title}
              tabIndex={checked ? 0 : -1}
              className={styles.segItem}
              onClick={() => {
                if (!o.disabled) onSelect(o.id);
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
