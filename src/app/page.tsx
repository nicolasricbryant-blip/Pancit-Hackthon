import { coerceGameId, getGame } from "@/features/games/config";
import { ScrimFinder } from "@/features/scrims/ScrimFinder";

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function Page(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const game = coerceGameId(searchParams.game);
  const config = getGame(game);

  // Wrapper hands the selected game's hue down to every card/button/chip.
  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <h1 className="page-title">Scrim Finder</h1>
        <p className="page-sub">
          Teams available now in {config.label}. Filter by rank, time, and format —
          then request a scrim in one tap.
        </p>
        <ScrimFinder key={game} game={game} />
      </div>
    </div>
  );
}
