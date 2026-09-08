import { getGame, type GameId } from "@/features/games/config";

/**
 * Compact hero strip for the Scrim Finder feed. Type only — no box, no border.
 * Shows the game context and the live unfiltered open-team count.
 */
export function FinderHero({
  game,
  openCount,
}: {
  game: GameId;
  openCount: number;
}) {
  const config = getGame(game);

  return (
    <header className="finder-hero">
      <p className="hero-kicker">SCRIM FINDER</p>
      <h1 className="hero-line">Find a scrim in {config.label}.</h1>
      <p className="hero-sub">
        {openCount} {openCount === 1 ? "team" : "teams"} open right now · request
        in one tap
      </p>
    </header>
  );
}
