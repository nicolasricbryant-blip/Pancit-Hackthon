/**
 * Date / time formatting for the events feature. All formatters pin
 * `Asia/Manila` + `en-PH` so server and client render identical strings
 * (no hydration drift).
 */

const TZ = "Asia/Manila";
const LOCALE = "en-PH";

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dateYearFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Sat, Mar 8" — or with year when not the current year. */
export function fmtDay(iso: string | null): string {
  const d = parse(iso);
  if (!d) return "Date TBD";
  const thisYear = new Date().getFullYear();
  return d.getFullYear() === thisYear ? dateFmt.format(d) : dateYearFmt.format(d);
}

/** "6:00 PM" or "6:00 PM – 10:00 PM" when an end is known. */
export function fmtTimeRange(startIso: string | null, endIso: string | null): string {
  const s = parse(startIso);
  if (!s) return "Time TBD";
  const e = parse(endIso);
  if (!e) return timeFmt.format(s);
  return `${timeFmt.format(s)} – ${timeFmt.format(e)}`;
}

/** Full range for the detail page: "Sat, Mar 8 · 6:00 PM – 10:00 PM". */
export function fmtFullRange(startIso: string | null, endIso: string | null): string {
  const s = parse(startIso);
  if (!s) return "Schedule to be announced";
  const e = parse(endIso);
  const sameDay =
    e != null && dateYearFmt.format(s) === dateYearFmt.format(e);
  if (!e) return `${fmtDay(startIso)} · ${timeFmt.format(s)}`;
  if (sameDay) {
    return `${fmtDay(startIso)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`;
  }
  return `${fmtDay(startIso)} ${timeFmt.format(s)} – ${fmtDay(endIso)} ${timeFmt.format(e)}`;
}

/** Coarse relative time: "just now", "3h ago", "2d ago", "in 5d". */
export function relativeTime(iso: string | null): string {
  const d = parse(iso);
  if (!d) return "";
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

/** True when the event's end (or start, if no end) is in the past. */
export function isPast(startIso: string | null, endIso: string | null): boolean {
  const ref = parse(endIso) ?? parse(startIso);
  if (!ref) return false;
  return ref.getTime() < Date.now();
}

/** Sort key: start time in ms, or +Infinity for undated events (sink to bottom). */
export function startKey(iso: string | null): number {
  const d = parse(iso);
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}
