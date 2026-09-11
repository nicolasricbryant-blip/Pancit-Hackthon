import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { coerceGameId } from "@/features/games/config";
import { getCurrentProfile } from "@/features/auth/session";
import { getLobby } from "@/features/lobbies/queries";
import { FindingTeammates } from "@/features/match/FindingTeammates";

export const metadata: Metadata = { title: "Finding Teammates" };

type ScopeVars = React.CSSProperties & Record<`--${string}`, string>;

export default async function MatchSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lobbyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lobbyId } = await params;
  const sp = await searchParams;
  const game = coerceGameId(sp.game);

  const lobby = await getLobby(lobbyId);
  if (!lobby) notFound();

  const profile = await getCurrentProfile();
  const viewerId = profile?.id ?? null;
  const isHost = viewerId != null && viewerId === lobby.hostId;

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${lobby.game})`,
    "--game-current-dim": `var(--game-${lobby.game}-dim)`,
  };

  return (
    <div className="feed-scope" data-game={lobby.game} style={scopeStyle}>
      <FindingTeammates
        lobby={lobby}
        game={game}
        viewerId={viewerId}
        isHost={isHost}
      />
    </div>
  );
}
