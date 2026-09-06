"use client";

import { LOOKING_FOR_LABEL, ROLE_OPTIONS, type LookingFor } from "./types";

export interface FilterState {
  lookingFor: "" | LookingFor;
  role: string;
}

export const EMPTY_FILTERS: FilterState = { lookingFor: "", role: "" };

interface Props {
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}

export function FreeAgentFilterBar({ value, onChange, onClear }: Props) {
  const chips: Array<{ key: keyof FilterState; label: string }> = [];
  if (value.lookingFor) {
    chips.push({ key: "lookingFor", label: LOOKING_FOR_LABEL[value.lookingFor] });
  }
  if (value.role) chips.push({ key: "role", label: value.role });

  return (
    <div className="filter-bar" role="search" aria-label="Filter listings">
      <label className="filter-field">
        <span className="filter-label">Looking for</span>
        <select
          className="filter-select"
          value={value.lookingFor}
          onChange={(e) =>
            onChange({ lookingFor: e.target.value as FilterState["lookingFor"] })
          }
        >
          <option value="">Any</option>
          <option value="team">{LOOKING_FOR_LABEL.team}</option>
          <option value="player">{LOOKING_FOR_LABEL.player}</option>
        </select>
      </label>

      <label className="filter-field">
        <span className="filter-label">Role</span>
        <select
          className="filter-select"
          value={value.role}
          onChange={(e) => onChange({ role: e.target.value })}
        >
          <option value="">Any role</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((c) => (
            <span key={c.key} className="chip">
              {c.label}
              <button
                type="button"
                className="chip-x"
                aria-label={`Clear ${c.label} filter`}
                onClick={() =>
                  onChange({ [c.key]: "" } as Partial<FilterState>)
                }
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" className="chip-clear" onClick={onClear}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
