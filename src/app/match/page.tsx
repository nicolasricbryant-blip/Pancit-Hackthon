import type { Metadata } from "next";
import { coerceGameId, getGame } from "@/features/games/config";
import { getCurrentProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FindMatchLauncher } from "@/features/match/FindMatchLauncher";
import styles from "@/features/match/match.module.css";

export const metadata: Metadata = { title: "Find Match" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);
  const profile = await getCurrentProfile();

  let hasRole = false;
  let rankMin: string | null = null;
  let rankMax: string | null = null;
  let micOk = true;
  // Whether auto-join for this game was ALREADY on before this page load —
  // i.e. a deliberate, persistent opt-in made on /profile. FindMatchLauncher
  // needs this to tell its own one-shot enable apart from that pre-existing
  // choice, so cancelling this search can turn auto-join back off without
  // ever touching a preference the user set deliberately elsewhere.
  let autojoinEnabled = false;

  if (profile) {
    const supabase = await createClient();
    const [{ data: gp }, { data: pref }] = await Promise.all([
      supabase
        .from("game_profiles")
        .select("main_roles")
        .eq("profile_id", profile.id)
        .eq("game_id", game)
        .maybeSingle(),
      supabase
        .from("lobby_autojoin_prefs")
        .select("rank_min, rank_max, mic_ok, enabled")
        .eq("profile_id", profile.id)
        .eq("game_id", game)
        .maybeSingle(),
    ]);
    hasRole = (gp?.main_roles ?? []).length > 0;
    rankMin = pref?.rank_min ?? null;
    rankMax = pref?.rank_max ?? null;
    micOk = pref?.mic_ok ?? true;
    autojoinEnabled = pref?.enabled ?? false;
  }

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={game}>
      <div className={styles.launcherWrap}>
        <FindMatchLauncher
          game={game}
          gameLabel={config.label}
          rankTiers={config.rankTiers}
          signedIn={profile != null}
          hasRole={hasRole}
          initialRankMin={rankMin}
          initialRankMax={rankMax}
          initialMicOk={micOk}
          initialAutojoinEnabled={autojoinEnabled}
        />
      </div>
    </div>
  );
}
