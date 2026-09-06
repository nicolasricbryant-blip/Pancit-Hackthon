"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GAMES, coerceGameId, type GameId } from "@/features/games/config";

type HueVars = React.CSSProperties & {
  "--seg-hue"?: string;
  "--seg-hue-dim"?: string;
};

/**
 * Persistent 4-way game switcher (header, every screen).
 * Radio group, keyboard-navigable. Selection lives in the `?game=` searchParam;
 * updating it never scroll-jumps the feed.
 */
export function GameSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = coerceGameId(searchParams.get("game") ?? undefined);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = useCallback(
    (id: GameId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("game", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = GAMES.findIndex((g) => g.id === current);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % GAMES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + GAMES.length) % GAMES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = GAMES.length - 1;
    else return;

    e.preventDefault();
    select(GAMES[next].id);
    btnRefs.current[next]?.focus();
  };

  return (
    <div
      className="game-switcher"
      role="radiogroup"
      aria-label="Select game"
      onKeyDown={onKeyDown}
    >
      {GAMES.map((g, i) => {
        const checked = g.id === current;
        return (
          <button
            key={g.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="game-seg"
            style={
              {
                "--seg-hue": `var(${g.hueToken})`,
                "--seg-hue-dim": `var(${g.hueToken}-dim)`,
              } as HueVars
            }
            onClick={() => select(g.id)}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
