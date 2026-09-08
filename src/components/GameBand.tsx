"use client";

import { useSearchParams } from "next/navigation";
import { coerceGameId } from "@/features/games/config";
import { GameSwitcher } from "./GameSwitcher";

type BandVars = React.CSSProperties & {
  "--band-bg"?: string;
  "--band-hue"?: string;
};

/**
 * Full-width context band under the top bar. Its background is a dim tint of the
 * active game's hue, and it exposes `--band-hue` for the segmented GameSwitcher
 * it wraps. Sticky just below the header.
 */
export function GameBand() {
  const searchParams = useSearchParams();
  const game = coerceGameId(searchParams.get("game") ?? undefined);

  const style: BandVars = {
    "--band-bg": `var(--game-${game}-band)`,
    "--band-hue": `var(--game-${game})`,
  };

  return (
    <div className="game-band" style={style} data-game={game}>
      <GameSwitcher />
    </div>
  );
}
