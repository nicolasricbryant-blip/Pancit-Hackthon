/** Shimmer placeholder shown while the feed "loads". */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="shimmer sk-line lg" />
      <div className="shimmer sk-line sm" />
      <div className="shimmer sk-line" />
      <div className="shimmer sk-line sm" />
      <div className="shimmer sk-btn" />
    </div>
  );
}
