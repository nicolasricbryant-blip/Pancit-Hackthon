import Link from "next/link";
import { KIND_LABEL, type OrgListItem } from "./types";
import { OrgAvatar, VerifiedBadge } from "./OrgBits";
import styles from "./orgs.module.css";

/** One org in the browse grid. Links to the org profile. */
export function OrgCard({ org }: { org: OrgListItem }) {
  return (
    <Link href={`/orgs/${org.slug}`} className={styles.card}>
      <div className={styles.cardTop}>
        <OrgAvatar name={org.name} logoUrl={org.logo_url} />
        <div className={styles.cardHead}>
          <span className={styles.cardName}>
            {org.name}
            {org.verified && <VerifiedBadge />}
          </span>
          {org.short_name && (
            <span className={styles.cardShort}>{org.short_name}</span>
          )}
        </div>
      </div>

      <div className={styles.cardMeta}>
        <span className={styles.kindTag}>{KIND_LABEL[org.kind]}</span>
        {org.region && (
          <>
            <span className={styles.sep}>·</span>
            <span>{org.region}</span>
          </>
        )}
      </div>

      <div className={styles.statStrip}>
        <span>
          <span className={styles.statLabel}>TEAMS</span>
          <span className={styles.statNum}>{org.teamCount}</span>
        </span>
      </div>
    </Link>
  );
}
