"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GAMES, type GameId } from "@/features/games/config";
import {
  addMemberByHandle,
  removeMember,
  updateMember,
  updateTeam,
} from "./actions";
import { SchoolCombobox } from "./SchoolCombobox";
import {
  ROLE_LABEL,
  ROSTER_ROLES,
  normalizeTag,
  type RosterMember,
  type RosterRole,
  type SchoolLite,
  type TeamProfile,
} from "./types";
import styles from "./forms.module.css";

interface Props {
  team: TeamProfile;
  schools: SchoolLite[];
}

export function ManageTeamClient({ team, schools }: Props) {
  const router = useRouter();

  return (
    <div className={styles.manageWrap}>
      <TeamFields team={team} schools={schools} onDone={() => router.refresh()} />
      <RosterEditor
        teamId={team.id}
        roster={team.roster}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function TeamFields({
  team,
  schools,
  onDone,
}: {
  team: TeamProfile;
  schools: SchoolLite[];
  onDone: () => void;
}) {
  const [name, setName] = useState(team.name);
  const [tag, setTag] = useState(team.tag ?? "");
  const [gameId, setGameId] = useState<GameId>(team.game_id);
  const [schoolId, setSchoolId] = useState<string | null>(team.school?.id ?? null);
  const [region, setRegion] = useState(team.region ?? "");
  const [bio, setBio] = useState(team.bio ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const res = await updateTeam({
      teamId: team.id,
      name,
      tag,
      gameId,
      schoolId,
      region,
      bio,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    onDone();
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Team details</h2>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && (
          <div className={styles.formError} role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className={styles.formOk} role="status">
            Saved.
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-name">
            Team name
          </label>
          <input
            id="mng-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-tag">
            Tag
          </label>
          <input
            id="mng-tag"
            className={`${styles.input} ${styles.mono}`}
            type="text"
            maxLength={5}
            value={tag}
            onChange={(e) => setTag(normalizeTag(e.target.value))}
            disabled={submitting}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-game">
            Game
          </label>
          <select
            id="mng-game"
            className={styles.input}
            value={gameId}
            onChange={(e) => setGameId(e.target.value as GameId)}
            disabled={submitting}
          >
            {GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>School</span>
          <SchoolCombobox
            schools={schools}
            value={schoolId}
            onPick={(s) => {
              setSchoolId(s?.id ?? null);
              if (s?.region) setRegion(s.region);
            }}
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-region">
            Region
          </label>
          <input
            id="mng-region"
            className={styles.input}
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-bio">
            Bio
          </label>
          <textarea
            id="mng-bio"
            className={styles.textarea}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          className={styles.submit}
          data-loading={submitting}
          disabled={submitting}
        >
          Save changes
        </button>
      </form>
    </section>
  );
}

/* --------------------------------------------------------------------------- */

function RosterEditor({
  teamId,
  roster,
  onDone,
}: {
  teamId: string;
  roster: RosterMember[];
  onDone: () => void;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Roster</h2>

      {roster.length === 0 ? (
        <p className={styles.hint}>No roster set yet. Add your first member below.</p>
      ) : (
        <ul className={styles.rosterEdit}>
          {roster.map((m) => (
            <RosterRow key={m.id} member={m} onDone={onDone} />
          ))}
        </ul>
      )}

      <AddMemberRow teamId={teamId} onDone={onDone} />
    </section>
  );
}

function RosterRow({
  member,
  onDone,
}: {
  member: RosterMember;
  onDone: () => void;
}) {
  const [role, setRole] = useState<RosterRole>(member.role);
  const [jersey, setJersey] = useState(member.jerseyName ?? "");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = role !== member.role || jersey !== (member.jerseyName ?? "");

  async function save() {
    setError(null);
    setBusy("save");
    const res = await updateMember({ memberId: member.id, role, jerseyName: jersey });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    const res = await removeMember({ memberId: member.id });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <li className={styles.rosterEditRow}>
      <div className={styles.rosterEditWho}>
        <span className={styles.rosterEditName}>
          {member.displayName || "Unknown player"}
        </span>
        {member.handle && (
          <span className={styles.rosterEditHandle}>@{member.handle}</span>
        )}
      </div>

      <label className={styles.rosterEditControl}>
        <span className={styles.srOnly}>Jersey name</span>
        <input
          className={styles.input}
          type="text"
          placeholder="Jersey name"
          value={jersey}
          onChange={(e) => setJersey(e.target.value)}
          disabled={busy !== null}
        />
      </label>

      <label className={styles.rosterEditControl}>
        <span className={styles.srOnly}>Role</span>
        <select
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value as RosterRole)}
          disabled={busy !== null}
        >
          {ROSTER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.rosterEditActions}>
        <button
          type="button"
          className={styles.smallBtn}
          data-loading={busy === "save"}
          disabled={busy !== null || !dirty}
          onClick={save}
        >
          Save
        </button>
        <button
          type="button"
          className={styles.smallBtnDanger}
          data-loading={busy === "remove"}
          disabled={busy !== null}
          onClick={remove}
        >
          Remove
        </button>
      </div>

      {error && (
        <p className={styles.rosterEditError} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function AddMemberRow({
  teamId,
  onDone,
}: {
  teamId: string;
  onDone: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<RosterRole>("starter");
  const [jersey, setJersey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    if (!handle.trim()) {
      setError("Enter a handle.");
      return;
    }
    setBusy(true);
    const res = await addMemberByHandle({
      teamId,
      handle,
      role,
      jerseyName: jersey,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setHandle("");
    setJersey("");
    setRole("starter");
    onDone();
  }

  return (
    <div className={styles.addRow}>
      <h3 className={styles.addTitle}>Add member</h3>
      <div className={styles.addGrid}>
        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Handle</span>
          <div className={styles.handleWrap} data-invalid={!!error}>
            <span className={styles.handlePrefix} aria-hidden>
              @
            </span>
            <input
              className={styles.handleInput}
              type="text"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={busy}
            />
          </div>
        </label>

        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Jersey name</span>
          <input
            className={styles.input}
            type="text"
            placeholder="Jersey name (optional)"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Role</span>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as RosterRole)}
            disabled={busy}
          >
            {ROSTER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.smallBtn}
          data-loading={busy}
          disabled={busy}
          onClick={add}
        >
          Add
        </button>
      </div>
      {error && (
        <p className={styles.rosterEditError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function ManageHeader({ team }: { team: TeamProfile }) {
  return (
    <div className={styles.manageHead}>
      <Link href={`/teams/${team.id}`} className={styles.backLink}>
        ← Back to team
      </Link>
      <h1 className={styles.manageTitle}>
        Manage {team.name}
        {team.tag && <span className={styles.manageTag}>{team.tag}</span>}
      </h1>
    </div>
  );
}
