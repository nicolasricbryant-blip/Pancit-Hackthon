"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BoardKind } from "./types";
import styles from "./leaderboards.module.css";

const OPTIONS: { id: BoardKind; label: string }[] = [
  { id: "team", label: "Teams" },
  { id: "player", label: "Players" },
];

/** Team / Player segmented pill for the mobile Teams tab. URL-driven (`?board=`),
 * shareable and back-button safe — same convention as LeaderboardControls. */
export function RankBoardToggle({ board }: { board: BoardKind }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = useCallback(
    (value: BoardKind) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("board", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className={styles.rankToggle} role="radiogroup" aria-label="Board">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={board === o.id}
          className={styles.rankToggleItem}
          onClick={() => select(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
