"use client";

import { useState } from "react";
import { GAMES, type GameId } from "@/features/games/config";
import { createTeam } from "./actions";
import { SchoolCombobox } from "./SchoolCombobox";
import { normalizeTag, type SchoolLite } from "./types";
import styles from "./forms.module.css";

interface Props {
  schools: SchoolLite[];
  defaultGame: GameId;
}

export function NewTeamForm({ schools, defaultGame }: Props) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [gameId, setGameId] = useState<GameId>(defaultGame);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameError = touched && name.trim().length < 2;
  const tagError = touched && tag.length < 2;
  const regionError = touched && region.trim().length < 2;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);
    if (name.trim().length < 2 || tag.length < 2 || region.trim().length < 2) {
      return;
    }

    setSubmitting(true);
    const res = await createTeam({
      name,
      tag,
      gameId,
      schoolId,
      region,
      bio,
    });
    // On success the action redirects and this never runs.
    if (res && !res.ok) {
      setSubmitting(false);
      setFormError(res.error);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="team-name">
          Team name
        </label>
        <input
          id="team-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError}
          aria-describedby={nameError ? "team-name-err" : undefined}
          disabled={submitting}
          required
        />
        {nameError && (
          <span id="team-name-err" className={styles.fieldError}>
            At least 2 characters.
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="team-tag">
          Tag
        </label>
        <input
          id="team-tag"
          className={`${styles.input} ${styles.mono}`}
          type="text"
          inputMode="text"
          maxLength={5}
          value={tag}
          onChange={(e) => setTag(normalizeTag(e.target.value))}
          aria-invalid={tagError}
          aria-describedby="team-tag-hint"
          disabled={submitting}
          required
        />
        <span
          id="team-tag-hint"
          className={tagError ? styles.fieldError : styles.hint}
        >
          {tagError
            ? "2–5 characters."
            : "Up to 5 letters/numbers, shown on cards. Auto-uppercased."}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="team-game">
          Game
        </label>
        <select
          id="team-game"
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
        <span className={styles.hint}>Optional — leave blank for an independent team.</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="team-region">
          Region
        </label>
        <input
          id="team-region"
          className={styles.input}
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. NCR"
          aria-invalid={regionError}
          aria-describedby={regionError ? "team-region-err" : undefined}
          disabled={submitting}
          required
        />
        {regionError ? (
          <span id="team-region-err" className={styles.fieldError}>
            Region is required.
          </span>
        ) : (
          <span className={styles.hint}>
            Prefilled from your school — edit if you compete elsewhere.
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="team-bio">
          Bio
        </label>
        <textarea
          id="team-bio"
          className={styles.textarea}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Optional — a line about the team."
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Create team
      </button>
    </form>
  );
}
