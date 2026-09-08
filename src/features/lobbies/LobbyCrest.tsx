import styles from "@/app/lobbies/lobbies.module.css";

/**
 * Small initials monogram for a lobby host / member. Derives up to two initials
 * from the name and renders a rounded-square badge tinted with the current
 * game's hue (`--lobby-hue` when set on an ancestor, else `--game-current`).
 * Sizing is inline because it is pure geometry, not colour.
 */
export function LobbyCrest({ name, size = 40 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (words[0] ?? "").slice(0, 2).toUpperCase();

  return (
    <span
      className={styles.crest}
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials || "?"}
    </span>
  );
}
