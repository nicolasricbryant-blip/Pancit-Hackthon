"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "@/app/profile/profile.module.css";

export interface ProfileTab {
  id: string;
  label: string;
  panel: ReactNode;
}

/** Dumb controlled tab strip. Two panels, arrow-key roving focus, persists nothing. */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (active + dir + tabs.length) % tabs.length;
    setActive(next);
    btnRefs.current[next]?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div
        role="tablist"
        aria-label="Profile sections"
        className={styles.tablist}
        onKeyDown={onKeyDown}
      >
        {tabs.map((t, i) => {
          const selected = i === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={i !== active}
          tabIndex={0}
          className={styles.panel}
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
