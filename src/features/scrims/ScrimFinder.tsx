"use client";

import { useMemo, useState } from "react";
import { getGame, type GameId } from "@/features/games/config";
import { FilterBar, EMPTY_FILTERS, type FilterState } from "./FilterBar";
import { ScrimCard } from "./ScrimCard";
import type { ScrimListing } from "./types";

/**
 * Scrim Finder — the product. Dense, functional feed of available teams in the
 * selected game, narrowed by three structured filters. Header game selection is
 * passed in as `game`; the filter bar narrows further.
 *
 * Listings are fetched live on the server and handed down as `listings`. Mounted
 * with `key={game}` by the page, so a game change remounts this with fresh
 * filter state and a fresh set of listings.
 */
export function ScrimFinder({
  game,
  listings,
}: {
  game: GameId;
  listings: ScrimListing[];
}) {
  const config = getGame(game);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const results = useMemo(() => {
    return listings
      .filter((l) => l.game === game)
      .filter((l) => !filters.rankBand || l.rankTiers.includes(filters.rankBand))
      .filter(
        (l) =>
          !filters.timeWindow ||
          filters.timeWindow === "Custom" ||
          l.timeWindow === filters.timeWindow,
      )
      .filter((l) => !filters.format || l.format === filters.format);
  }, [listings, game, filters]);

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

      <p className="result-count">
        {results.length} {results.length === 1 ? "team" : "teams"} available
      </p>

      <div className="feed-grid">
        {results.length === 0 ? (
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
