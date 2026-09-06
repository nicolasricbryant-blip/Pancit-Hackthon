import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { isAdmin } from "@/features/auth/roles";
import { getTournamentBySlug } from "@/features/brackets/queries";
import { ManageBracketClient } from "@/features/brackets/ManageBracketClient";
import { roundLabel } from "@/features/brackets/types";
import styles from "@/features/brackets/brackets.module.css";

export const metadata: Metadata = { title: "Manage bracket" };

type Params = Promise<{ slug: string }>;

export default async function ManageBracketPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const profile = await requireProfile(`/brackets/${slug}/manage`);
  const t = await getTournamentBySlug(slug);
  if (!t) notFound();
  if (t.hostProfileId !== profile.id && !isAdmin(profile)) notFound();

  const readyMatches = t.bracket.flatMap((m) => {
    if (m.status !== "ready" || !m.teamA || !m.teamB) return [];
    return [
      {
        id: m.id,
        label: `${roundLabel(m.round, t.rounds)} · M${m.slot + 1}`,
        teamA: m.teamA.name,
        teamB: m.teamB.name,
      },
    ];
  });

  const otherMatches = t.bracket
    .filter((m) => m.status !== "ready")
    .map((m) => ({
      id: m.id,
      label: `${roundLabel(m.round, t.rounds)} · M${m.slot + 1}`,
      line: `${m.teamA?.name ?? "TBD"}  ${m.scoreA ?? "–"} — ${m.scoreB ?? "–"}  ${m.teamB?.name ?? "TBD"}`,
      status: m.status,
    }));

  return (
    <div className={styles.wrap}>
      <div className={styles.manageHead}>
        <Link href={`/brackets/${slug}`} className={styles.backLink}>
          ← Back to tournament
        </Link>
        <h1 className={styles.manageTitle}>Manage {t.name}</h1>
      </div>

      <ManageBracketClient
        slug={slug}
        status={t.status}
        size={t.size}
        entrants={t.entrants.map((e) => ({
          id: e.id,
          name: e.name,
          seed: e.seed,
        }))}
        readyMatches={readyMatches}
        otherMatches={otherMatches}
        championName={t.champion?.name ?? null}
      />
    </div>
  );
}
