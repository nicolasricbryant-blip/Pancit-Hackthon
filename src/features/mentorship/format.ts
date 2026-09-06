/**
 * Coarse relative-time formatter for the mentorship feed. Mirrors
 * `src/features/events/format.ts` — output is relative to "now", so no timezone
 * pinning is needed and server / client render the same string.
 */

/** "just now", "3h ago", "2d ago", "in 5d". */
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const deltaMs = d.getTime() - Date.now();
  const past = deltaMs <= 0;
  const abs = Math.abs(deltaMs);
  const min = Math.round(abs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return past ? `${min}m ago` : `in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return past ? `${hr}h ago` : `in ${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 30) return past ? `${day}d ago` : `in ${day}d`;
  const mo = Math.round(day / 30);
  return past ? `${mo}mo ago` : `in ${mo}mo`;
}
