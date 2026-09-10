import { SkeletonCard } from "@/features/scrims/SkeletonCard";

/** Route-level Suspense fallback for `/` while `listScrimsForGame` resolves. */
export default function Loading() {
  return (
    <div className="page-wrap">
      <div className="feed-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
