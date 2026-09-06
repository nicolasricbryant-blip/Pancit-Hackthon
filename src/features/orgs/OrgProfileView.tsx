import Link from "next/link";
import {
  KIND_LABEL,
  LINK_KEYS,
  LINK_LABEL,
  ORG_ROLE_LABEL,
  type OrgProfile,
} from "./types";
import { OrgAvatar, VerifiedBadge } from "./OrgBits";
import styles from "./orgs.module.css";

interface Props {
  org: OrgProfile;
  canManage: boolean;
}

/** Public org profile — header, bio, links, members, teams. */
export function OrgProfileView({ org, canManage }: Props) {
  const linkEntries = LINK_KEYS.filter((k) => org.links[k]).map((k) => ({
    key: k,
    href: org.links[k] as string,
  }));

  return (
    <div className={styles.profile}>
      <header className={styles.profileHead}>
        <div className={styles.profileTop}>
          <OrgAvatar name={org.name} logoUrl={org.logo_url} size="lg" />
          <div className={styles.profileIdent}>
            <h1 className={styles.profileName}>
              {org.name}
              {org.verified && <VerifiedBadge />}
            </h1>
            <div className={styles.profileMeta}>
              <span className={styles.kindTag}>{KIND_LABEL[org.kind]}</span>
              {org.short_name && (
                <>
                  <span className={styles.sep}>·</span>
                  <span>{org.short_name}</span>
                </>
              )}
              {org.region && (
                <>
                  <span className={styles.sep}>·</span>
                  <span>{org.region}</span>
                </>
              )}
              {org.school && (
                <>
                  <span className={styles.sep}>·</span>
                  <span>{org.school.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {org.bio && <p className={styles.profileBio}>{org.bio}</p>}

        {linkEntries.length > 0 && (
          <div className={styles.linkRow}>
            {linkEntries.map((l) => (
              <a
                key={l.key}
                className={styles.linkPill}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {LINK_LABEL[l.key]}
              </a>
            ))}
          </div>
        )}

        {canManage && (
          <Link href={`/orgs/${org.slug}/manage`} className={styles.manageLink}>
            Manage org
          </Link>
        )}
      </header>

      <section className={styles.block} aria-labelledby="org-members-heading">
        <h2 id="org-members-heading" className={styles.blockHeading}>
          Members
        </h2>
        {org.members.length === 0 ? (
          <p className={styles.blockEmpty}>No members listed yet.</p>
        ) : (
          <ul className={styles.memberList}>
            {org.members.map((m) => (
              <li key={m.id} className={styles.memberRow}>
                <span className={styles.memberName}>
                  {m.displayName || "Unknown"}
                </span>
                {m.handle && (
                  <span className={styles.memberHandle}>@{m.handle}</span>
                )}
                {m.title && (
                  <span className={styles.memberTitle}>{m.title}</span>
                )}
                <span className={styles.rolePill} data-role={m.role}>
                  {ORG_ROLE_LABEL[m.role]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} aria-labelledby="org-teams-heading">
        <h2 id="org-teams-heading" className={styles.blockHeading}>
          Teams
        </h2>
        {org.teams.length === 0 ? (
          <p className={styles.blockEmpty}>No teams under this org yet.</p>
        ) : (
          <ul className={styles.teamList}>
            {org.teams.map((t) => (
              <li key={t.id}>
                <Link href={`/teams/${t.id}`} className={styles.teamRow}>
                  <span className={styles.teamName}>{t.name}</span>
                  {t.tag && <span className={styles.teamTag}>{t.tag}</span>}
                  {t.region && (
                    <span className={styles.teamRegion}>{t.region}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
