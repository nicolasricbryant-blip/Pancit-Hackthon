import { coerceGameId } from "@/features/games/config";
import { FinderHero } from "@/features/scrims/FinderHero";
import { ScrimFinder } from "@/features/scrims/ScrimFinder";
import { listScrimsForGame } from "@/features/scrims/queries";

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
  "--game-current-band"?: string;
};

export default async function Page(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const game = coerceGameId(searchParams.game);
  const listings = await listScrimsForGame(game);

  // Wrapper hands the selected game's hue system down to every card/button/chip.
  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
    "--game-current-band": `var(--game-${game}-band)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className="page-wrap">
        <FinderHero game={game} openCount={listings.length} />
        <ScrimFinder key={game} game={game} listings={listings} />
      </div>
    </div>
  );
}
