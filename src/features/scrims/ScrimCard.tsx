import type { ScrimListing } from "./types";
import { RequestScrimButton } from "./RequestScrimButton";

function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Verified team" aria-label="Verified">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 7.9l1.6 1.6 3-3.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ScrimCard({ listing }: { listing: ScrimListing }) {
  return (
    <article className="scrim-card">
      <div className="card-head">
        <div className="card-team">
          <span>{listing.teamName}</span>
          {listing.verified && <VerifiedBadge />}
        </div>
        <div className="card-school">{listing.school}</div>
      </div>

      <div className="stat-row">
        <span>
          <span className="label">RATING</span>
          {listing.rating}
        </span>
        <span>
          <span className="label">RELIABILITY</span>
          {listing.reliability}%
        </span>
        <span className="hue-dot" aria-hidden />
      </div>

      <div className="meta-row">
        <span>{listing.availability}</span>
        <span className="sep">·</span>
        <span>{listing.format}</span>
        <span className="sep">·</span>
        <span>{listing.rankBand}</span>
      </div>

      <div className="card-action">
        <RequestScrimButton teamName={listing.teamName} />
      </div>
    </article>
  );
}
