import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  coerceFormFields,
  coerceStringArray,
  claimedRankEntries,
} from "@/features/rank/form";
import { RankSubmitForm } from "@/features/rank/RankSubmitForm";
import styles from "../rank.module.css";

export const metadata: Metadata = { title: "Submit rank" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export default async function RankSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile("/rank/submit");
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);

  const supabase = await createClient();

  const { data: gameRow } = await supabase
    .from("games")
    .select("form_fields, rank_tiers")
    .eq("id", game)
    .single();

  const fields = coerceFormFields(gameRow?.form_fields);
  const rankTiers = coerceStringArray(gameRow?.rank_tiers);

  const { data: gp } = await supabase
    .from("game_profiles")
    .select("claimed_rank")
    .eq("profile_id", profile.id)
    .eq("game_id", game)
    .maybeSingle();

  const initialValues = Object.fromEntries(
    claimedRankEntries(gp?.claimed_rank ?? null),
  );

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  return (
    <div className={styles.scope} style={scopeStyle} data-game={game}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <Link className={styles.emptyHint} href={`/rank?game=${game}`}>
            ‹ Back to My Rank
          </Link>
          <h1 className={styles.title}>Submit {config.label} rank</h1>
          <p className={styles.sub}>
            Fill in what applies, attach a screenshot of your in-game rank
            screen, and a reviewer will confirm it.
          </p>
        </div>

        <RankSubmitForm
          game={game}
          fields={fields}
          rankTiers={rankTiers}
          initialValues={initialValues}
        />
      </div>
    </div>
  );
}
