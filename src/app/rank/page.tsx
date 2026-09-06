import type { Metadata } from "next";
import Link from "next/link";
import { coerceGameId, getGame } from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { coerceVerificationStatus } from "@/features/rank/form";
import { RankStatusBadge } from "@/features/rank/RankStatusBadge";
import styles from "./rank.module.css";

export const metadata: Metadata = { title: "My Rank" };

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

const BLURB: Record<string, string> = {
  unverified: "Submit a screenshot to get your rank checked by a reviewer.",
  pending: "A reviewer is looking at your latest submission. This usually takes a day.",
  verified: "Your rank is confirmed. It shows a shield across scrims and teams.",
  rejected: "Your last submission was not accepted. Fix the note below and re-submit.",
};

export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile("/rank");
  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const config = getGame(game);

  const supabase = await createClient();
  const { data: gp } = await supabase
    .from("game_profiles")
    .select("id, rank_label, verification_status")
    .eq("profile_id", profile.id)
    .eq("game_id", game)
    .maybeSingle();

  const status = coerceVerificationStatus(gp?.verification_status);

  let reviewReason: string | null = null;
  if (gp && status === "rejected") {
    const { data: sub } = await supabase
      .from("rank_submissions")
      .select("review_reason")
      .eq("game_profile_id", gp.id)
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    reviewReason = sub?.review_reason ?? null;
  }

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${game})`,
    "--game-current-dim": `var(--game-${game}-dim)`,
  };

  const hasProfile = !!gp;
  const ctaLabel = hasProfile ? "Re-submit rank" : "Submit rank";

  return (
    <div className={styles.scope} style={scopeStyle} data-game={game}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <h1 className={styles.title}>My Rank</h1>
          <p className={styles.sub}>
            Your verified rank in {config.label}. Used to seed ratings and to
            match you into fair scrims.
          </p>
        </div>

        <section className={styles.card} aria-labelledby="rank-card-title">
          <div className={styles.cardTop}>
            <div className={styles.rankLine}>
              <span id="rank-card-title" className={styles.rankLabel}>
                {gp?.rank_label?.trim() || "No rank on file"}
              </span>
              <span className={styles.gameTag}>{config.label}</span>
            </div>
            <RankStatusBadge status={status} />
          </div>

          <p className={styles.blurb}>{BLURB[status]}</p>

          {status === "rejected" && (
            <div className={styles.reason} role="alert">
              <span className={styles.reasonLabel}>Reviewer note</span>
              <span className={styles.reasonBody}>
                {reviewReason?.trim() || "No note was left."}
              </span>
            </div>
          )}

          <Link
            className={styles.cta}
            href={`/rank/submit?game=${game}`}
            data-variant={status === "pending" ? "muted" : "primary"}
          >
            {ctaLabel}
          </Link>
        </section>

        {!hasProfile && (
          <p className={styles.emptyHint}>
            Nothing here yet — your first submission creates your {config.label}{" "}
            rank profile.
          </p>
        )}
      </div>
    </div>
  );
}
