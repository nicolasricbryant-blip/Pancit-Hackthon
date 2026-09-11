"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TAB_NAV, withGame, type Role } from "@/config/nav";

/**
 * Primary navigation. Mobile: fixed bottom tab bar. Desktop (>=768px): fixed
 * left rail. Renders the five TAB_NAV slots — icon glyph stacked over a label.
 * Role-gating happens on the "More" page, not here, but the `roles` prop is kept
 * so the shell can pass session context through if a tab ever needs gating.
 */
export function AppNav({ roles }: { roles?: Role[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const game = searchParams.get("game");

  // TAB_NAV slots are currently ungated; this keeps the shell forward-compatible
  // if a role-gated tab is ever added.
  const items = TAB_NAV.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!roles) return true;
    return item.roles.some((r) => roles.includes(r));
  });

  return (
    <nav className="app-tabbar" aria-label="Primary">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const href = item.gameScoped ? withGame(item.href, game) : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            className="app-tab"
            aria-current={active ? "page" : undefined}
          >
            <TabIcon label={item.label} />
            <span className="app-tab-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ label }: { label: string }) {
  return (
    <svg
      className="app-tab-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[label] ?? ICON_PATHS.More}
    </svg>
  );
}

const ICON_PATHS: Record<string, React.ReactNode> = {
  // house
  Home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </>
  ),
  // crosshair / target — matchmaking
  Match: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </>
  ),
  // lightning bolt (still used by the "Scrims" entry inside More)
  Scrims: <path d="M13 2 4 14h7l-1 8 10-12h-7l1-8Z" />,
  // three ascending bars
  Ladder: <path d="M5 20v-4M12 20v-9M19 20V6" />,
  // two people
  Teams: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.6-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.3A3 3 0 0 1 17 11" />
      <path d="M17 15c2.4.4 4 2.2 4 5" />
    </>
  ),
  // calendar
  Events: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  // 2x2 grid
  More: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
};
