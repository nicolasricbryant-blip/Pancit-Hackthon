"use client";

import {
  SCRIM_FORMATS,
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

/** Segmented time-window axis. "Custom" is a filter-state value with no UI. */
const TIME_CHIPS: Array<{ label: string; value: "" | TimeWindow }> = [
  { label: "All", value: "" },
  { label: "Tonight", value: "Tonight" },
  { label: "This Week", value: "This Week" },
  { label: "Weekend", value: "Weekend" },
];

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
      <div
        className="chip-scroll"
        role="group"
        aria-label="Time window"
      >
        {TIME_CHIPS.map((c) => {
          const active = value.timeWindow === c.value;
          return (
            <button
              key={c.label}
              type="button"
              className="chip-toggle"
              aria-pressed={active}
              onClick={() => onChange({ timeWindow: c.value })}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="filter-selects">
        <label className="filter-field">
          <span className="filter-label">Rank</span>
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
      </div>

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
