"use client";

import { useMemo, useState } from "react";
import { OrgCard } from "./OrgCard";
import { KIND_LABEL, ORG_KINDS, type OrgKind, type OrgListItem } from "./types";
import styles from "./orgs.module.css";

interface Props {
  orgs: OrgListItem[];
  regions: string[];
}

/**
 * Browse every org. Kind + region narrow the grid client-side. `orgs` is
 * already server-rendered and present in props, so there's nothing to wait
 * on — no artificial loading/skeleton pass.
 */
export function OrgsBrowser({ orgs, regions }: Props) {
  const [kind, setKind] = useState<OrgKind | "">("");
  const [region, setRegion] = useState("");

  const results = useMemo(
    () =>
      orgs
        .filter((o) => !kind || o.kind === kind)
        .filter((o) => !region || o.region === region),
    [orgs, kind, region],
  );

  const chips: { key: "kind" | "region"; label: string }[] = [];
  if (kind) chips.push({ key: "kind", label: KIND_LABEL[kind] });
  if (region) chips.push({ key: "region", label: region });

  function clearAll() {
    setKind("");
    setRegion("");
  }

  return (
    <>
      <div className={styles.filterBar} role="search" aria-label="Filter orgs">
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Kind</span>
          <select
            className={styles.filterSelect}
            value={kind}
            onChange={(e) => setKind(e.target.value as OrgKind | "")}
          >
            <option value="">All kinds</option>
            {ORG_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

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

        {chips.length > 0 && (
          <div className={styles.chipRow}>
            {chips.map((c) => (
              <span key={c.key} className={styles.chip}>
                {c.label}
                <button
                  type="button"
                  className={styles.chipX}
                  aria-label={`Clear ${c.label} filter`}
                  onClick={() => (c.key === "kind" ? setKind("") : setRegion(""))}
                >
                  ×
                </button>
              </span>
            ))}
            <button type="button" className={styles.chipClear} onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <p className={styles.resultCount}>
        {results.length} {results.length === 1 ? "org" : "orgs"}
      </p>

      <div className={styles.grid}>
        {results.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No orgs match — widen your filters.</p>
            <button type="button" className={styles.resetBtn} onClick={clearAll}>
              Reset filters
            </button>
          </div>
        ) : (
          results.map((o) => <OrgCard key={o.id} org={o} />)
        )}
      </div>
    </>
  );
}
