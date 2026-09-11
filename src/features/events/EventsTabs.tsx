"use client";

import { useState } from "react";
import Link from "next/link";
import { kindLabel, type EventView } from "./types";
import { fmtDay, fmtTimeRange } from "./format";
import styles from "./events.module.css";

type Tab = "upcoming" | "past";

interface Props {
  upcoming: EventView[];
  past: EventView[];
}

/**
 * Upcoming / Past segmented tabs. The top upcoming event renders as a hero
 * banner (same visual weight as the Scrim Finder hero); everything after it —
 * upcoming or past — is a compact row with a "View Details" link through to
 * the full RSVP / check-in page.
 */
export function EventsTabs({ upcoming, past }: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const list = tab === "upcoming" ? upcoming : past;
  const heroEvent = tab === "upcoming" && list.length > 0 ? list[0] : null;
  const restEvents = heroEvent ? list.slice(1) : list;

  return (
    <div className={styles.tabsWrap}>
      <div className={styles.tabsToggle} role="radiogroup" aria-label="Events">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tab === t}
            className={styles.tabsItem}
            onClick={() => setTab(t)}
          >
            {t === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {tab === "upcoming" ? "No events yet — host one." : "No past events yet."}
          </p>
          {tab === "upcoming" && (
            <Link href="/events/new" className={styles.emptyCta}>
              Host an event
            </Link>
          )}
        </div>
      ) : (
        <>
          {heroEvent && <EventHero event={heroEvent} />}
          {restEvents.length > 0 && (
            <ul className={styles.rowList}>
              {restEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EventHero({ event }: { event: EventView }) {
  const {
    id,
    title,
    kind,
    is_physical,
    venue,
    region,
    starts_at,
    ends_at,
    capacity,
    goingCount,
    viewerStatus,
  } = event;
  const place = [venue, region].filter(Boolean).join(", ");

  return (
    <Link href={`/events/${id}`} className={styles.hero}>
      <div className={styles.heroArt}>
        <span className={styles.heroBadge}>{kindLabel(kind)}</span>
        <h2 className={styles.heroTitle}>{title}</h2>
        <p className={styles.heroMeta}>
          {fmtDay(starts_at)} · {fmtTimeRange(starts_at, ends_at)}
          {is_physical && place ? ` · ${place}` : ""}
        </p>
      </div>
      <div className={styles.heroFooter}>
        <span className={styles.heroFooterMeta}>
          {goingCount} going{capacity ? ` / ${capacity}` : ""}
        </span>
        <span className={styles.heroCta}>
          {viewerStatus === "going" ? "You're going ✓" : "RSVP"}
        </span>
      </div>
    </Link>
  );
}

function EventRow({ event }: { event: EventView }) {
  const { id, title, kind, starts_at, ends_at } = event;
  return (
    <li className={styles.row}>
      <span className={styles.rowIcon} aria-hidden>
        {kindLabel(kind).charAt(0)}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowMeta}>
          {fmtDay(starts_at)} · {fmtTimeRange(starts_at, ends_at)}
        </span>
      </span>
      <Link href={`/events/${id}`} className={styles.rowCta}>
        View Details
      </Link>
    </li>
  );
}
