import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/features/games/config";
import { AvatarUpload } from "@/features/profile/AvatarUpload";
import { ProfileTabs } from "@/features/profile/ProfileTabs";
import { GameProfileCard } from "@/features/profile/GameProfileCard";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Profile" };

const ROLE_LABEL: Record<string, string> = {
  player: "Player",
  handler: "Handler",
  admin: "Admin",
};

/** Small shield-check — school verification mark. Reimplemented inline (not imported). */
function VerifiedCheck() {
  return (
    <span
      className={styles.verified}
      role="img"
      aria-label="School verified"
      title="School verified"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 6.9C5.1 13.1 3 10.7 3 7.5v-4l5-2z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 7.9l1.6 1.6 3-3.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const user = await getUser();
  if (!user) redirect("/sign-in?next=%2Fprofile");

  const supabase = await createClient();

  const { data: gpRows } = await supabase
    .from("game_profiles")
    .select("game_id, rank_label, verification_status, main_roles")
    .eq("profile_id", profile.id);

  const gpByGame = new Map(
    (gpRows ?? []).map((r) => [r.game_id, r] as const),
  );

  const { data: prefRows } = await supabase
    .from("lobby_autojoin_prefs")
    .select("game_id, enabled, rank_min, rank_max, modes, mic_ok")
    .eq("profile_id", profile.id);

  const prefsByGame = new Map(
    (prefRows ?? []).map((r) => [r.game_id, r] as const),
  );

  let schoolName: string | null = null;
  if (profile.school_id) {
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .maybeSingle();
    schoolName = school?.name ?? null;
  }

  const roles = profile.roles ?? [];
  const displayName = profile.display_name ?? "Player";
  const email = user.email ?? null;

  // HONEST COPY: scrim_matches + bracket_matches are team-scoped — no clean
  // per-player Scrims/Wins/Win-Rate source in the schema. Render em dash.
  const stats: { label: string; value: string }[] = [
    { label: "Scrims", value: "—" },
    { label: "Wins", value: "—" },
    { label: "Win Rate", value: "—" },
  ];

  const gamePanel = (
    <div className={styles.gameList}>
      {GAMES.map((g) => (
        <GameProfileCard
          key={g.id}
          game={g}
          gp={gpByGame.get(g.id) ?? null}
          userId={user.id}
          mainRoles={gpByGame.get(g.id)?.main_roles ?? []}
          autojoin={prefsByGame.get(g.id) ?? null}
        />
      ))}
    </div>
  );

  const accountPanel = (
    <dl className={styles.accountList}>
      <div className={styles.accountRow}>
        <dt className={styles.accountKey}>Email</dt>
        <dd className={styles.accountVal}>{email ?? "—"}</dd>
      </div>
      <div className={styles.accountRow}>
        <dt className={styles.accountKey}>Handle</dt>
        <dd className={styles.accountVal}>
          {profile.handle ? `@${profile.handle}` : "Not set"}
        </dd>
      </div>
      <div className={styles.accountRow}>
        <dt className={styles.accountKey}>School</dt>
        <dd className={styles.accountVal}>
          {schoolName
            ? profile.school_verified
              ? `${schoolName} · Verified`
              : schoolName
            : "Not set"}
        </dd>
      </div>
      <div className={styles.accountRow}>
        <dt className={styles.accountKey}>Region</dt>
        <dd className={styles.accountVal}>{profile.region ?? "Not set"}</dd>
      </div>
      <div className={styles.accountRow}>
        <dt className={styles.accountKey}>Roles</dt>
        <dd className={styles.accountVal}>
          {roles.length
            ? roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")
            : "—"}
        </dd>
      </div>
    </dl>
  );

  return (
    <div className={styles.wrap}>
      <section className={styles.identity}>
        <AvatarUpload
          userId={user.id}
          initialUrl={profile.avatar_url}
          displayName={displayName}
        />

        <div className={styles.idCol}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{displayName}</h1>
            {profile.school_verified && <VerifiedCheck />}
          </div>
          <div className={styles.idMeta}>
            {profile.handle && (
              <span className={styles.handle}>@{profile.handle}</span>
            )}
            {email && <span className={styles.email}>{email}</span>}
          </div>
        </div>
      </section>

      <div className={styles.identBlock}>
        <div className={styles.chips}>
          {roles.length > 0 ? (
            roles.map((r) => (
              <span key={r} className={styles.chip}>
                {ROLE_LABEL[r] ?? r}
              </span>
            ))
          ) : (
            <span className={styles.chip}>Player</span>
          )}
        </div>
        {!roles.includes("handler") && (
          <p className={styles.handlerHint}>
            Handle a team?{" "}
            <Link href="/settings" className={styles.handlerHintLink}>
              Turn on in Settings
            </Link>
          </p>
        )}
      </div>

      <div className={styles.statGrid}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statTile}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statCaption}>No matches yet</span>
          </div>
        ))}
      </div>

      <ProfileTabs
        tabs={[
          { id: "games", label: "Game Profiles", panel: gamePanel },
          { id: "account", label: "Account", panel: accountPanel },
        ]}
      />
    </div>
  );
}
