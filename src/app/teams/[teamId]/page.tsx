import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/features/games/config";
import { getUser } from "@/features/auth/session";
import { getTeamProfile } from "@/features/teams/queries";
import { StatPanels } from "@/features/teams/StatPanels";
import { RosterList } from "@/features/teams/RosterList";
import styles from "@/features/teams/teams.module.css";

type ScopeVars = React.CSSProperties & {
  "--game-current"?: string;
  "--game-current-dim"?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeamProfile(teamId);
  return { title: team ? team.name : "Team" };
}

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await getTeamProfile(teamId);
  if (!team) notFound();

  const user = await getUser();
  const config = getGame(team.game_id);
  const isHandlerViewer = !!user && user.id === team.handlerId;
  const school = team.school?.name ?? "Independent";

  const scopeStyle: ScopeVars = {
    "--game-current": `var(--game-${team.game_id})`,
    "--game-current-dim": `var(--game-${team.game_id}-dim)`,
  };

  return (
    <div className="feed-scope" style={scopeStyle} data-game={team.game_id}>
      <div className={styles.wrap}>
        <div className={styles.profile}>
          <header className={styles.profileHead}>
            <div className={styles.profileNameRow}>
              <h1 className={styles.profileName}>{team.name}</h1>
              {team.tag && <span className={styles.profileTag}>{team.tag}</span>}
            </div>
            <div className={styles.profileMeta}>
              <span>{school}</span>
              {team.region && (
                <>
                  <span className={styles.sep}>·</span>
                  <span>{team.region}</span>
                </>
              )}
              <span className={styles.sep}>·</span>
              <span>{config.label}</span>
            </div>
            {team.bio && <p className={styles.profileBio}>{team.bio}</p>}
            {isHandlerViewer && (
              <Link
                href={`/teams/${team.id}/manage`}
                className={styles.manageLink}
              >
                Manage team
              </Link>
            )}
          </header>

          <StatPanels
            competitive={team.competitive}
            community={team.community}
          />

          <section className={styles.rosterBlock} aria-labelledby="roster-heading">
            <h2 id="roster-heading" className={styles.rosterHeading}>
              Roster
            </h2>
            <RosterList roster={team.roster} />
            {team.roster.length === 0 && isHandlerViewer && (
              <Link
                href={`/teams/${team.id}/manage`}
                className={styles.manageLink}
              >
                Set the roster
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
