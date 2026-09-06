"use client";

import { useState } from "react";
import Link from "next/link";
import { GAMES, type GameId } from "@/features/games/config";
import { createTournament } from "./actions";
import {
  SCOPES,
  SCOPE_LABEL,
  SIZE_OPTIONS,
  isValidSlug,
  slugify,
} from "./types";
import styles from "./brackets.module.css";

export function NewBracketForm({ defaultGame }: { defaultGame: GameId }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [gameId, setGameId] = useState<GameId>(defaultGame);
  const [size, setSize] = useState<number>(8);
  const [scope, setScope] = useState<string>("local");
  const [region, setRegion] = useState("");
  const [ratingEffect, setRatingEffect] = useState(true);
  const [startsAt, setStartsAt] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  const nameError = touched && name.trim().length < 3;
  const slugError = touched && !isValidSlug(effectiveSlug);
  const regionError = touched && region.trim().length < 2;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);
    if (
      name.trim().length < 3 ||
      !isValidSlug(effectiveSlug) ||
      region.trim().length < 2
    ) {
      return;
    }

    setSubmitting(true);
    const res = await createTournament({
      name,
      slug: effectiveSlug,
      gameId,
      size,
      scope,
      region,
      ratingEffect,
      startsAt,
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
        <label className={styles.label} htmlFor="bt-name">
          Tournament name
        </label>
        <input
          id="bt-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError}
          disabled={submitting}
          required
        />
        {nameError && (
          <span className={styles.fieldError}>At least 3 characters.</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="bt-slug">
          URL
        </label>
        <input
          id="bt-slug"
          className={`${styles.input} ${styles.mono}`}
          type="text"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(slugify(e.target.value));
          }}
          aria-invalid={slugError}
          disabled={submitting}
          required
        />
        <span className={slugError ? styles.fieldError : styles.hint}>
          {slugError
            ? "2–39 characters: lowercase letters, numbers, hyphens."
            : `/brackets/${effectiveSlug || "your-tournament"}`}
        </span>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bt-game">
            Game
          </label>
          <select
            id="bt-game"
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
          <label className={styles.label} htmlFor="bt-size">
            Bracket size
          </label>
          <select
            id="bt-size"
            className={styles.input}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            disabled={submitting}
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} teams
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bt-scope">
            Scope
          </label>
          <select
            id="bt-scope"
            className={styles.input}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={submitting}
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="bt-region">
            Region
          </label>
          <input
            id="bt-region"
            className={styles.input}
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. NCR"
            aria-invalid={regionError}
            disabled={submitting}
            required
          />
          {regionError && (
            <span className={styles.fieldError}>Region is required.</span>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="bt-starts">
          Starts (optional)
        </label>
        <input
          id="bt-starts"
          className={styles.input}
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          disabled={submitting}
        />
        <span className={styles.hint}>Philippine time (UTC+8).</span>
      </div>

      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={ratingEffect}
          onChange={(e) => setRatingEffect(e.target.checked)}
          disabled={submitting}
        />
        <span>
          <span className={styles.checkName}>Rated tournament</span>
          <span className={styles.hint}>
            Results update team Elo, standing, and player ratings.
          </span>
        </span>
      </label>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Create tournament
      </button>
      <Link href="/brackets" className={styles.cancelLink}>
        Cancel
      </Link>
    </form>
  );
}
