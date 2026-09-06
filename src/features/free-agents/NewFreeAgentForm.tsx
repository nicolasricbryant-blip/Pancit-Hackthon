"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { GAMES, getGame, type GameId } from "@/features/games/config";
import { createPost } from "./actions";
import {
  BLURB_MAX,
  LOOKING_FOR_LABEL,
  ROLE_OPTIONS,
  type LookingFor,
} from "./types";
import styles from "./free-agents.module.css";

interface Props {
  defaultGame: GameId;
  teams: { id: string; name: string; tag: string | null }[];
}

const LOOKING_FOR_DESC: Record<LookingFor, string> = {
  team: "You're a player looking to join a roster.",
  player: "You're filling an open slot on a team.",
};

export function NewFreeAgentForm({ defaultGame, teams }: Props) {
  const uid = useId();
  const [gameId, setGameId] = useState<GameId>(defaultGame);
  const [lookingFor, setLookingFor] = useState<LookingFor>("team");
  const [teamId, setTeamId] = useState<string>("");
  const [rankLabel, setRankLabel] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [blurb, setBlurb] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const rankTiers = useMemo(() => getGame(gameId).rankTiers, [gameId]);
  const showTeam = lookingFor === "player" && teams.length > 0;

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (blurb.trim().length > BLURB_MAX) {
      setFormError(`Keep the blurb under ${BLURB_MAX} characters.`);
      return;
    }

    setSubmitting(true);
    const res = await createPost({
      game: gameId,
      lookingFor,
      teamId: showTeam && teamId ? teamId : null,
      rankLabel,
      rolesWanted: roles,
      blurb,
    });
    // On success the action redirects and this never runs.
    if (res && !res.ok) {
      setSubmitting(false);
      setFormError(res.error);
    }
  }

  const blurbLeft = BLURB_MAX - blurb.trim().length;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Listing</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-game`}>
            Game
          </label>
          <select
            id={`${uid}-game`}
            className={styles.select}
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
          <span className={styles.label}>Looking for</span>
          <div className={styles.radioRow}>
            {(Object.keys(LOOKING_FOR_LABEL) as LookingFor[]).map((v) => (
              <label key={v} className={styles.radio} data-on={lookingFor === v}>
                <input
                  type="radio"
                  name="looking_for"
                  value={v}
                  checked={lookingFor === v}
                  onChange={() => setLookingFor(v)}
                  disabled={submitting}
                />
                <span className={styles.radioText}>
                  <span className={styles.radioName}>{LOOKING_FOR_LABEL[v]}</span>
                  <span className={styles.radioDesc}>{LOOKING_FOR_DESC[v]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {showTeam && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-team`}>
              Team (optional)
            </label>
            <select
              id={`${uid}-team`}
              className={styles.select}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={submitting}
            >
              <option value="">No specific team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tag ? `[${t.tag}] ${t.name}` : t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-rank`}>
            Rank (optional)
          </label>
          <input
            id={`${uid}-rank`}
            className={styles.input}
            type="text"
            list={`${uid}-ranks`}
            value={rankLabel}
            onChange={(e) => setRankLabel(e.target.value)}
            placeholder="e.g. Mythical Glory"
            maxLength={60}
            disabled={submitting}
          />
          <datalist id={`${uid}-ranks`}>
            {rankTiers.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Roles wanted (optional)</span>
          <div className={styles.checkGrid}>
            {ROLE_OPTIONS.map((r) => (
              <label key={r} className={styles.check} data-on={roles.includes(r)}>
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => toggleRole(r)}
                  disabled={submitting}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-blurb`}>
            Blurb (optional)
          </label>
          <textarea
            id={`${uid}-blurb`}
            className={styles.textarea}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            placeholder="Availability, playstyle, what you're after."
            disabled={submitting}
          />
          <span
            className={styles.count}
            data-over={blurbLeft < 0}
            style={blurbLeft < 0 ? { color: "var(--color-danger)" } : undefined}
          >
            {blurbLeft} left
          </span>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          data-loading={submitting}
          disabled={submitting}
        >
          Post listing
        </button>
        <Link href="/free-agents" className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
