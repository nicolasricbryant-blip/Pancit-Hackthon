"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { GAMES } from "@/features/games/config";
import { createRequest } from "./actions";
import {
  KIND_LABEL,
  MENTORSHIP_KINDS,
  NOTES_MAX,
  NOTES_MIN,
  type ActionResult,
} from "./types";
import styles from "./mentorship.module.css";

const INITIAL: ActionResult = { ok: true };

const KIND_HINT: Record<string, string> = {
  vod_review: "Send a replay or VOD link in the notes — a mentor reviews it.",
  coaching_session: "Live practice or a scrim-review call with a veteran.",
  general: "Draft picks, habits, mindset — anything you're stuck on.",
};

export function NewMentorshipForm() {
  const [state, formAction, pending] = useActionState(createRequest, INITIAL);
  const [kind, setKind] = useState<string>(MENTORSHIP_KINDS[0]);
  const [notes, setNotes] = useState("");
  const uid = useId();

  const notesTooShort = notes.trim().length > 0 && notes.trim().length < NOTES_MIN;

  return (
    <form className={styles.form} action={formAction}>
      {state.ok === false && (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>What do you need?</legend>
        <div className={styles.radioRow}>
          {MENTORSHIP_KINDS.map((k) => (
            <label
              key={k}
              className={styles.radioItem}
              data-checked={kind === k}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                disabled={pending}
              />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
        <p className={styles.hint}>{KIND_HINT[kind]}</p>
      </fieldset>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-game`}>
          Game
        </label>
        <select
          id={`${uid}-game`}
          name="game_id"
          className={styles.select}
          defaultValue=""
          disabled={pending}
        >
          <option value="">Any game</option>
          {GAMES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${uid}-notes`}>
          Notes
        </label>
        <textarea
          id={`${uid}-notes`}
          name="notes"
          className={styles.textarea}
          rows={5}
          required
          minLength={NOTES_MIN}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What are you working on? Link a VOD, name a matchup, or describe where you keep losing."
          aria-invalid={notesTooShort}
          disabled={pending}
        />
        <span className={notesTooShort ? styles.fieldError : styles.hint}>
          {notesTooShort
            ? `At least ${NOTES_MIN} characters.`
            : `${notes.trim().length} / ${NOTES_MAX}`}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          data-loading={pending}
          disabled={pending}
        >
          Post request
        </button>
        <Link href="/mentorship" className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
