"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PRIMARY_NAV, withGame, type Role } from "@/config/nav";

/**
 * Primary nav strip under the header. Scrollable on mobile.
 *
 * Milestone 1: renders every non-role-gated item plus role-gated ones are shown
 * too (no session yet). The auth feature passes `roles` to hide what the current
 * profile can't use.
 */
export function AppNav({ roles }: { roles?: Role[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const game = searchParams.get("game");

  const items = PRIMARY_NAV.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!roles) return true; // no session context — show it, page can gate
    return item.roles.some((r) => roles.includes(r));
  });

  return (
    <nav className="app-nav" aria-label="Primary">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.gameScoped ? withGame(item.href, game) : item.href}
            className="app-nav-link"
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
