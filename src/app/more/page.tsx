import Link from "next/link";
import { getCurrentProfile } from "@/features/auth/session";
import { navRoles } from "@/features/auth/roles";
import { PRIMARY_NAV, TAB_HREFS, withGame, ROUTES } from "@/config/nav";
import { version as appVersion } from "../../../package.json";

/**
 * "More" overflow index — every PRIMARY_NAV destination that isn't one of the
 * five tab-bar slots, with the same role-gating the tab bar would apply. Ends
 * with a sign-out action and the brand tagline, matching the reference nav
 * drawer (icon rows + Log Out + "Same Game. More People." footer).
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
            <span className="more-link-icon" aria-hidden="true">
              <NavGlyph href={item.href} />
            </span>
            <span className="more-link-label">{item.label}</span>
            <span aria-hidden="true" className="more-chevron">
              ›
            </span>
          </Link>
        ))}
      </nav>

      {profile && (
        <form action="/auth/sign-out" method="post">
          <button type="submit" className="more-logout">
            Log Out
          </button>
        </form>
      )}

      <div className="more-footer">
        <span className="more-footer-tag">Same Game. More People.</span>
        <span className="more-footer-version">v{appVersion}</span>
      </div>
    </div>
  );
}

function NavGlyph({ href }: { href: string }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (href) {
    case ROUTES.notifications:
      return (
        <svg {...props}>
          <path d="M6 9a6 6 0 1 1 12 0c0 3 1 5 1.5 5.5H4.5C5 14 6 12 6 9Z" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case ROUTES.leaderboards:
      return (
        <svg {...props}>
          <path d="M5 20v-4M12 20v-9M19 20V6" />
        </svg>
      );
    case ROUTES.lobbies:
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c0-3 2.6-5 5.5-5s5.5 2 5.5 5" />
          <path d="M15.5 5.3A3 3 0 0 1 17 11" />
          <path d="M17 15c2.4.4 4 2.2 4 5" />
        </svg>
      );
    case ROUTES.brackets:
      return (
        <svg {...props}>
          <path d="M6 4v6M6 10c0 3 3 3 3 3M6 10c0-3-3 3-3-3M6 4h-3M6 4h3" />
          <path d="M18 4v6M18 10c0 3-3 3-3 3M18 10c0 3 3-3 3 3M18 4h-3M18 4h3" />
          <path d="M9 13h6M12 13v6" />
        </svg>
      );
    case ROUTES.freeAgents:
      return (
        <svg {...props}>
          <circle cx="10" cy="8" r="3.2" />
          <path d="M3.5 20c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6" />
          <path d="M18 8v4M16 10h4" />
        </svg>
      );
    case ROUTES.orgs:
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />
        </svg>
      );
    case ROUTES.mentorship:
      return (
        <svg {...props}>
          <path d="M12 3 2 8l10 5 10-5-10-5Z" />
          <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
        </svg>
      );
    case ROUTES.matches:
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="1.5" />
          <path d="M9 3v2h6V3M8 10h8M8 14h5" />
        </svg>
      );
    case ROUTES.rank:
      return (
        <svg {...props}>
          <path d="M12 3l3 1.5v4c0 3.5-2 6-3 7-1-1-3-3.5-3-7v-4L12 3Z" />
        </svg>
      );
    case ROUTES.rankReview:
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 12.5h8M8 16h5" />
        </svg>
      );
    case ROUTES.settings:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5a7.4 7.4 0 0 0 0-3l1.9-1.5-2-3.4-2.3.6a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.3-.6-2 3.4L4.6 10a7.4 7.4 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.6a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.3a7.6 7.6 0 0 0 2.6-1.5l2.3.6 2-3.4-1.9-1.5Z" />
        </svg>
      );
    case ROUTES.help:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.3a2.5 2.5 0 1 1 3.9 2.1c-.9.6-1.4 1.1-1.4 2.1" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
