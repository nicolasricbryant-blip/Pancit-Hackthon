import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGame } from "@/features/games/config";
import { getUser } from "@/features/auth/session";
import {
  getTournamentBySlug,
  handledTeamsInGame,
} from "@/features/brackets/queries";
import { BracketDetail } from "@/features/brackets/BracketDetail";
import { SCOPE_LABEL } from "@/features/brackets/types";

type Params = Promise<{ slug: string }>;

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTournamentBySlug(slug);
  if (!t) return { title: "Tournament not found" };
  const scope = SCOPE_LABEL[t.scope as keyof typeof SCOPE_LABEL] ?? t.scope;
  return {
    title: t.name,
    description: `${scope} ${t.size}-team single-elimination · ${getGame(t.gameId).label}`,
  };
}

export default async function TournamentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getTournamentBySlug(slug);
  if (!detail) notFound();

  const user = await getUser();

  const eligible: { id: string; name: string }[] = [];
  const mine: { id: string; name: string }[] = [];
  if (user && detail.status === "registration") {
    const teams = await handledTeamsInGame(user.id, detail.gameId);
    const registered = new Set(detail.entrants.map((e) => e.teamId));
    for (const tm of teams) {
      (registered.has(tm.id) ? mine : eligible).push(tm);
    }
  }

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${detail.gameId})`,
    "--game-current-dim": `var(--game-${detail.gameId}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={detail.gameId}>
      <BracketDetail
        detail={detail}
        viewerId={user?.id ?? null}
        eligible={eligible}
        mine={mine}
      />
    </div>
  );
}
