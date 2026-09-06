import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/features/auth/session";
import { getMatchRoom } from "@/features/matches/queries";
import { MatchRoom } from "@/features/matches/MatchRoom";

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const data = await getMatchRoom(matchId, null);
  if (!data) return { title: "Match not found" };
  return { title: `${data.view.teamA.name} vs ${data.view.teamB.name}` };
}

export default async function MatchRoomPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const profile = await getCurrentProfile();
  const data = await getMatchRoom(matchId, profile?.id ?? null);
  if (!data) notFound();

  const game = data.view.game;
  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div style={scopeStyle} data-game={game}>
      <MatchRoom data={data} />
    </div>
  );
}
