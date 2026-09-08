import Link from "next/link";
import type { CSSProperties } from "react";
import type { GameConfig } from "@/features/games/config";
import styles from "@/app/profile/profile.module.css";

interface Gp {
  rank_label: string | null;
  verification_status: string;
}

const BADGE: Record<string, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: styles["gpBadge--ok"] },
  pending: { label: "Pending review", cls: styles["gpBadge--warn"] },
  rejected: { label: "Rejected", cls: styles["gpBadge--danger"] },
};

export function GameProfileCard({
  game,
  gp,
}: {
  game: GameConfig;
  gp: Gp | null;
}) {
  const status = gp?.verification_status ?? "unverified";
  const badge = BADGE[status];
  const isVerified = status === "verified";
  const href = `/rank/submit?game=${game.id}`;
  const hue = `var(${game.hueToken})`;

  return (
    <article
      className={styles.gpCard}
      style={{ borderLeftColor: hue } as CSSProperties}
    >
      <div className={styles.gpHead}>
        <span className={styles.gpTitle}>
          <span
            className={styles.gpDot}
            style={{ background: hue } as CSSProperties}
            aria-hidden
          />
          {game.label}
        </span>
        {badge && (
          <span className={`${styles.gpBadge} ${badge.cls}`}>{badge.label}</span>
        )}
      </div>

      <span className={gp?.rank_label ? styles.gpRank : styles.gpRankEmpty}>
        {gp?.rank_label ?? "No rank set"}
      </span>

      <div className={styles.gpCtaRow}>
        {isVerified ? (
          <Link
            href={href}
            className={`${styles.gpCta} ${styles["gpCta--muted"]}`}
          >
            Re-submit
          </Link>
        ) : (
          <Link href={href} className={styles.gpCta}>
            Verify rank
          </Link>
        )}
      </div>
    </article>
  );
}
