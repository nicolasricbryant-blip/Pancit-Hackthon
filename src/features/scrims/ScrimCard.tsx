import type { ScrimListing } from "./types";
import { RequestScrimButton } from "./RequestScrimButton";
import { TeamCrest } from "./TeamCrest";

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
  const tonight = listing.timeWindow === "Tonight";
  const pillTone = tonight ? "now" : "soon";
  const pillText = tonight ? "TONIGHT" : listing.timeWindow.toUpperCase();

  return (
    <article className="scrim-card">
      <div className="card-head">
        <TeamCrest name={listing.teamName} />
        <div className="card-id">
          <div className="card-team">
            <span>{listing.teamName}</span>
            {listing.verified && <VerifiedBadge />}
          </div>
          <div className="card-school">{listing.school}</div>
        </div>
        <span className={`pill pill--${pillTone}`}>{pillText}</span>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-label">Rating</span>
          <span className="stat-tile-value">{listing.rating}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Reliability</span>
          <span className="stat-tile-value">{listing.reliability}%</span>
        </div>
      </div>

      <div className="meta-chips">
        <span className="meta-chip">{listing.format}</span>
        <span className="meta-chip">{listing.rankBand}</span>
        <span className="meta-chip meta-chip--wide">{listing.availability}</span>
      </div>

      <div className="card-action">
        <RequestScrimButton teamName={listing.teamName} />
      </div>
    </article>
  );
}
