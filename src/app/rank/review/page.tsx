import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { isAdmin } from "@/features/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getGame, isGameId } from "@/features/games/config";
import { claimedRankEntries } from "@/features/rank/form";
import { ReviewCard, type ReviewItem } from "@/features/rank/ReviewCard";
import styles from "./review.module.css";

export const metadata: Metadata = { title: "Rank review queue" };

const SIGNED_URL_TTL = 120;

export default async function RankReviewPage() {
  const profile = await requireProfile("/rank/review");

  if (!isAdmin(profile)) {
    return (
      <div className={styles.wrap}>
        <div className={styles.denied} role="alert">
          <h1 className={styles.deniedTitle}>Admins only</h1>
          <p className={styles.deniedBody}>
            The rank review queue is limited to platform admins. If you think you
            should have access, ask an existing admin to grant it.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: subsRaw, error: subsErr } = await supabase
    .from("rank_submissions")
    .select(
      "id, game_id, claimed_rank, screenshot_path, created_at, profile_id",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const subs = subsRaw ?? [];

  if (subsErr) {
    return (
      <div className={styles.wrap}>
        <Header count={0} />
        <div className={styles.error} role="alert">
          Could not load the queue: {subsErr.message}
        </div>
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className={styles.wrap}>
        <Header count={0} />
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing waiting for review.</p>
          <p className={styles.emptyBody}>
            New rank submissions land here the moment a player sends one.
          </p>
        </div>
      </div>
    );
  }

  const profileIds = [...new Set(subs.map((s) => s.profile_id))];
  const { data: profRows } = await supabase
    .from("profiles")
    .select("id, handle, display_name, school_id")
    .in("id", profileIds);
  const profById = new Map((profRows ?? []).map((p) => [p.id, p]));

  const schoolIds = [
    ...new Set(
      (profRows ?? [])
        .map((p) => p.school_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  ];
  const { data: schoolRows } = schoolIds.length
    ? await supabase.from("schools").select("id, short_name").in("id", schoolIds)
    : { data: [] as { id: string; short_name: string | null }[] };
  const schoolById = new Map((schoolRows ?? []).map((s) => [s.id, s]));

  const items: ReviewItem[] = await Promise.all(
    subs.map(async (s) => {
      const prof = profById.get(s.profile_id);
      const school = prof?.school_id
        ? schoolById.get(prof.school_id)
        : undefined;

      let screenshotUrl: string | null = null;
      if (s.screenshot_path) {
        const { data: signed } = await supabase.storage
          .from("rank-proofs")
          .createSignedUrl(s.screenshot_path, SIGNED_URL_TTL);
        screenshotUrl = signed?.signedUrl ?? null;
      }

      return {
        submissionId: s.id,
        submitter:
          prof?.display_name?.trim() ||
          (prof?.handle ? `@${prof.handle}` : "Unknown player"),
        handle: prof?.handle ?? null,
        school: school?.short_name ?? null,
        gameLabel: isGameId(s.game_id) ? getGame(s.game_id).label : s.game_id,
        createdAtISO: s.created_at,
        chips: claimedRankEntries(s.claimed_rank),
        screenshotUrl,
      } satisfies ReviewItem;
    }),
  );

  return (
    <div className={styles.wrap}>
      <Header count={items.length} />
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.submissionId}>
            <ReviewCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Header({ count }: { count: number }) {
  return (
    <div className={styles.head}>
      <h1 className={styles.title}>Rank review queue</h1>
      <p className={styles.sub}>
        {count > 0
          ? `${count} submission${count === 1 ? "" : "s"} pending`
          : "Manual rank verification for every game."}
      </p>
    </div>
  );
}
