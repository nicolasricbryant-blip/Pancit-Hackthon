import { monogram } from "./types";
import styles from "./orgs.module.css";

/** Shield check badge for a verified org. */
export function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Verified org" aria-label="Verified">
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

interface AvatarProps {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "lg";
}

/** Org logo, or an initials monogram fallback. */
export function OrgAvatar({ name, logoUrl, size = "sm" }: AvatarProps) {
  const cls = size === "lg" ? styles.avatarLg : styles.avatarSm;
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={cls} src={logoUrl} alt="" width={size === "lg" ? 56 : 40} height={size === "lg" ? 56 : 40} />
    );
  }
  return (
    <span className={cls} aria-hidden>
      {monogram(name)}
    </span>
  );
}
