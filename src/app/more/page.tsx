import Link from "next/link";
import { getCurrentProfile } from "@/features/auth/session";
import { navRoles } from "@/features/auth/roles";
import { PRIMARY_NAV, TAB_HREFS, withGame } from "@/config/nav";

/**
 * "More" overflow index — every PRIMARY_NAV destination that isn't one of the
 * five tab-bar slots, with the same role-gating the tab bar would apply.
 */
export default async function MorePage(props: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await props.searchParams;
  const profile = await getCurrentProfile();
  const roles = navRoles(profile);

  const items = PRIMARY_NAV.filter((item) => {
    if (TAB_HREFS.has(item.href)) return false;
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((r) => roles.includes(r));
  });

  return (
    <div className="page-wrap">
      <h1 className="page-title">More</h1>
      <nav className="more-list" aria-label="More destinations">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.gameScoped ? withGame(item.href, game) : item.href}
            className="more-link"
          >
            <span>{item.label}</span>
            <span aria-hidden="true" className="more-chevron">
              ›
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
