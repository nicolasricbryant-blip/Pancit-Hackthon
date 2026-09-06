"use client";

import { useId, useMemo, useState } from "react";
import type { SchoolLite } from "./types";
import styles from "./forms.module.css";

interface Props {
  schools: SchoolLite[];
  value: string | null;
  onPick: (school: SchoolLite | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}

/** Searchable school picker. Selecting hands the whole row back to the parent. */
export function SchoolCombobox({
  schools,
  value,
  onPick,
  disabled = false,
  invalid = false,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const selected = useMemo(
    () => schools.find((s) => s.id === value) ?? null,
    [schools, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools.slice(0, 8);
    return schools
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.short_name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [schools, query]);

  if (selected) {
    return (
      <div className={styles.selectedSchool}>
        <span>
          {selected.name}
          {selected.short_name ? ` (${selected.short_name})` : ""}
        </span>
        <button
          type="button"
          className={styles.clearSchool}
          onClick={() => {
            onPick(null);
            setQuery("");
          }}
          disabled={disabled}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={styles.combo}>
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search by name or abbreviation…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const s = filtered[activeIdx];
            if (s) {
              onPick(s);
              setOpen(false);
              setQuery("");
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-invalid={invalid}
        disabled={disabled}
      />
      {open && (
        <div className={styles.comboList} id={listId} role="listbox">
          {filtered.length === 0 ? (
            <span className={styles.comboEmpty}>No match.</span>
          ) : (
            filtered.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                data-active={i === activeIdx}
                className={styles.comboOption}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{s.name}</span>
                <span className={styles.comboOptionSub}>
                  {[s.short_name, s.region].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
