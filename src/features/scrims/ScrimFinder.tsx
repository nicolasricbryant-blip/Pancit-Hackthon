"use client";

import { useEffect, useMemo, useState } from "react";
import { getGame, type GameId } from "@/features/games/config";
import { SCRIM_LISTINGS } from "./seed";
import { FilterBar, EMPTY_FILTERS, type FilterState } from "./FilterBar";
import { ScrimCard } from "./ScrimCard";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Scrim Finder — the product. Dense, functional feed of available teams in the
 * selected game, narrowed by three structured filters. Header game selection is
 * passed in as `game`; the filter bar narrows further.
 *
 * Mounted with `key={game}` by the page, so a game change remounts this with
 * fresh filter state and a fresh loading pass — no game-dependent effect needed.
 */
export function ScrimFinder({ game }: { game: GameId }) {
  const config = getGame(game);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  // Brief skeleton on mount, then reveal the feed.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => {
    return SCRIM_LISTINGS.filter((l) => l.game === game)
      .filter((l) => !filters.rankBand || l.rankTiers.includes(filters.rankBand))
      .filter(
        (l) =>
          !filters.timeWindow ||
          filters.timeWindow === "Custom" ||
          l.timeWindow === filters.timeWindow,
      )
      .filter((l) => !filters.format || l.format === filters.format);
  }, [game, filters]);

  const patch = (p: Partial<FilterState>) =>
    setFilters((f) => ({ ...f, ...p }));
  const clear = () => setFilters(EMPTY_FILTERS);

  return (
    <>
      <FilterBar
        rankTiers={config.rankTiers}
        value={filters}
        onChange={patch}
        onClear={clear}
      />

      {!loading && (
        <p className="result-count">
          {results.length} {results.length === 1 ? "team" : "teams"} available
        </p>
      )}

      <div className="feed-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : results.length === 0 ? (
          <div className="empty-state">
            <p>No scrims match — widen your filters.</p>
            <button type="button" className="reset-btn" onClick={clear}>
              Reset filters
            </button>
          </div>
        ) : (
          results.map((l) => <ScrimCard key={l.id} listing={l} />)
        )}
      </div>
    </>
  );
}
