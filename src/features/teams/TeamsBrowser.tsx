"use client";

import { useId, useMemo, useState } from "react";
import { TeamCard } from "./TeamCard";
import type { TeamListItem } from "./types";
import styles from "./teams.module.css";

interface Props {
  teams: TeamListItem[];
  regions: string[];
  schools: { name: string; short_name: string | null }[];
  gameLabel: string;
}

/**
 * Browse teams in the selected game. Region + school narrow the grid client-side.
 * Mounted with `key={game}` by the page, so a game switch gets fresh filters.
 * `teams` is already server-rendered and present in props, so there's nothing
 * to wait on — no artificial loading/skeleton pass.
 */
export function TeamsBrowser({ teams, regions, schools, gameLabel }: Props) {
  const schoolListId = useId();
  const [region, setRegion] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [school, setSchool] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const schoolMatches = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    const pool = q
      ? schools.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.short_name ?? "").toLowerCase().includes(q),
        )
      : schools;
    return pool.slice(0, 8);
  }, [schools, schoolQuery]);

  const results = useMemo(
    () =>
      teams
        .filter((t) => !region || t.region === region)
        .filter((t) => !school || t.school?.name === school),
    [teams, region, school],
  );

  const chips: { key: "region" | "school"; label: string }[] = [];
  if (region) chips.push({ key: "region", label: region });
  if (school) chips.push({ key: "school", label: school });

  function clearAll() {
    setRegion("");
    setSchool("");
    setSchoolQuery("");
  }

  return (
    <>
      <div className={styles.filterBar} role="search" aria-label="Filter teams">
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Region</span>
          <select
            className={styles.filterSelect}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.filterField}>
          <span className={styles.filterLabel} id={`${schoolListId}-label`}>
            School
          </span>
          {school ? (
            <div className={styles.filterSchoolPicked}>
              <span>{school}</span>
              <button
                type="button"
                className={styles.chipX}
                aria-label="Clear school filter"
                onClick={() => {
                  setSchool("");
                  setSchoolQuery("");
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div className={styles.combo}>
              <input
                className={styles.filterSelect}
                type="text"
                role="combobox"
                aria-expanded={schoolOpen}
                aria-controls={schoolListId}
                aria-autocomplete="list"
                aria-labelledby={`${schoolListId}-label`}
                placeholder="Any school"
                value={schoolQuery}
                onChange={(e) => {
                  setSchoolQuery(e.target.value);
                  setSchoolOpen(true);
                  setActiveIdx(0);
                }}
                onFocus={() => setSchoolOpen(true)}
                onBlur={() => setTimeout(() => setSchoolOpen(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) =>
                      Math.min(i + 1, schoolMatches.length - 1),
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const s = schoolMatches[activeIdx];
                    if (s) {
                      setSchool(s.name);
                      setSchoolOpen(false);
                    }
                  } else if (e.key === "Escape") {
                    setSchoolOpen(false);
                  }
                }}
              />
              {schoolOpen && (
                <div
                  className={styles.comboList}
                  id={schoolListId}
                  role="listbox"
                >
                  {schoolMatches.length === 0 ? (
                    <span className={styles.comboEmpty}>No match.</span>
                  ) : (
                    schoolMatches.map((s, i) => (
                      <button
                        key={s.name}
                        type="button"
                        role="option"
                        aria-selected={i === activeIdx}
                        data-active={i === activeIdx}
                        className={styles.comboOption}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSchool(s.name);
                          setSchoolOpen(false);
                        }}
                      >
                        <span>{s.name}</span>
                        {s.short_name && (
                          <span className={styles.comboOptionSub}>
                            {s.short_name}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {chips.length > 0 && (
          <div className={styles.chipRow}>
            {chips.map((c) => (
              <span key={c.key} className={styles.chip}>
                {c.label}
                <button
                  type="button"
                  className={styles.chipX}
                  aria-label={`Clear ${c.label} filter`}
                  onClick={() => {
                    if (c.key === "region") setRegion("");
                    else {
                      setSchool("");
                      setSchoolQuery("");
                    }
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              className={styles.chipClear}
              onClick={clearAll}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <p className={styles.resultCount}>
        {results.length} {results.length === 1 ? "team" : "teams"} in{" "}
        {gameLabel}
      </p>

      <div className={styles.grid}>
        {results.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No teams match — widen your filters.</p>
            <button type="button" className={styles.resetBtn} onClick={clearAll}>
              Reset filters
            </button>
          </div>
        ) : (
          results.map((t) => <TeamCard key={t.id} team={t} />)
        )}
      </div>
    </>
  );
}
