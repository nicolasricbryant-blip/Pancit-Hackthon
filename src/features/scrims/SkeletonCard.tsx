/** Shimmer placeholder shown while the feed "loads". Mirrors the scrim card. */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="sk-head">
        <div className="shimmer sk-crest" />
        <div className="sk-head-lines">
          <div className="shimmer sk-line lg" />
          <div className="shimmer sk-line sm" />
        </div>
      </div>
      <div className="sk-tiles">
        <div className="shimmer sk-tile" />
        <div className="shimmer sk-tile" />
      </div>
      <div className="shimmer sk-btn" />
    </div>
  );
}
