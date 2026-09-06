"use client";

import {
  SCRIM_FORMATS,
  TIME_WINDOWS,
  type ScrimFormat,
  type TimeWindow,
} from "./types";

export interface FilterState {
  rankBand: string;
  timeWindow: "" | TimeWindow;
  format: "" | ScrimFormat;
}

export const EMPTY_FILTERS: FilterState = {
  rankBand: "",
  timeWindow: "",
  format: "",
};

interface Props {
  /** Rank tiers for the currently selected game. */
  rankTiers: string[];
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}

export function FilterBar({ rankTiers, value, onChange, onClear }: Props) {
  const chips: Array<{ key: keyof FilterState; label: string }> = [];
  if (value.rankBand) chips.push({ key: "rankBand", label: value.rankBand });
  if (value.timeWindow) chips.push({ key: "timeWindow", label: value.timeWindow });
  if (value.format) chips.push({ key: "format", label: value.format });

  return (
    <div className="filter-bar" role="search" aria-label="Filter scrims">
      <label className="filter-field">
        <span className="filter-label">Rank Band</span>
        <select
          className="filter-select"
          value={value.rankBand}
          onChange={(e) => onChange({ rankBand: e.target.value })}
        >
          <option value="">All ranks</option>
          {rankTiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span className="filter-label">Time Window</span>
        <select
          className="filter-select"
          value={value.timeWindow}
          onChange={(e) =>
            onChange({ timeWindow: e.target.value as FilterState["timeWindow"] })
          }
        >
          <option value="">Any time</option>
          {TIME_WINDOWS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span className="filter-label">Format</span>
        <select
          className="filter-select"
          value={value.format}
          onChange={(e) =>
            onChange({ format: e.target.value as FilterState["format"] })
          }
        >
          <option value="">Any format</option>
          {SCRIM_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
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
                onClick={() => onChange({ [c.key]: "" } as Partial<FilterState>)}
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
