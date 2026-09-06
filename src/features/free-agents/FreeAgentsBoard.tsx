"use client";

import { useMemo, useState } from "react";
import type { FreeAgentPostView } from "./types";
import {
  EMPTY_FILTERS,
  FreeAgentFilterBar,
  type FilterState,
} from "./FreeAgentFilterBar";
import { FreeAgentCard } from "./FreeAgentCard";

interface Props {
  posts: FreeAgentPostView[];
  viewerId: string | null;
}

/**
 * Client board: server hands down the open listings for the selected game, this
 * narrows them by `looking_for` and role wanted. Mounted with `key={game}` by
 * the page, so a game switch remounts with fresh filter state.
 */
export function FreeAgentsBoard({ posts, viewerId }: Props) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const results = useMemo(() => {
    return posts
      .filter((p) => !filters.lookingFor || p.lookingFor === filters.lookingFor)
      .filter((p) => !filters.role || p.rolesWanted.includes(filters.role));
  }, [posts, filters]);

  const patch = (p: Partial<FilterState>) =>
    setFilters((f) => ({ ...f, ...p }));
  const clear = () => setFilters(EMPTY_FILTERS);

  return (
    <>
      <FreeAgentFilterBar value={filters} onChange={patch} onClear={clear} />

      <p className="result-count">
        {results.length} {results.length === 1 ? "listing" : "listings"}
      </p>

      <div className="feed-grid">
        {results.length === 0 ? (
          <div className="empty-state">
            <p>
              {posts.length === 0
                ? "No open listings for this game yet — post the first one."
                : "No listings match — widen your filters."}
            </p>
            {posts.length > 0 && (
              <button type="button" className="reset-btn" onClick={clear}>
                Reset filters
              </button>
            )}
          </div>
        ) : (
          results.map((p) => (
            <FreeAgentCard
              key={p.id}
              post={p}
              owned={viewerId != null && p.profileId === viewerId}
            />
          ))
        )}
      </div>
    </>
  );
}
