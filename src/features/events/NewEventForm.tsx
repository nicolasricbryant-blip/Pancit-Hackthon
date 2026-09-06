"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { GAMES } from "@/features/games/config";
import { createEvent, type CreateEventState } from "./actions";
import { EVENT_KINDS, KIND_LABEL } from "./types";
import styles from "./events.module.css";

interface SchoolOption {
  id: string;
  name: string;
  short_name: string | null;
}

const INITIAL: CreateEventState = { error: null };

export function NewEventForm({
  schools,
  defaultHostOrg,
}: {
  schools: SchoolOption[];
  defaultHostOrg: string;
}) {
  const [state, formAction, pending] = useActionState(createEvent, INITIAL);
  const [isPhysical, setIsPhysical] = useState(false);
  const uid = useId();

  return (
    <form className={styles.form} action={formAction}>
      {state.error && (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      )}

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Basics</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-title`}>
            Title
          </label>
          <input
            id={`${uid}-title`}
            name="title"
            className={styles.input}
            type="text"
            required
            minLength={3}
            maxLength={120}
            disabled={pending}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-kind`}>
              Type
            </label>
            <select
              id={`${uid}-kind`}
              name="kind"
              className={styles.select}
              defaultValue="meetup"
              disabled={pending}
            >
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

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
              <option value="">All games</option>
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-host`}>
            Hosted by
          </label>
          <input
            id={`${uid}-host`}
            name="host_org"
            className={styles.input}
            type="text"
            defaultValue={defaultHostOrg}
            placeholder="Org, club, or school"
            maxLength={120}
            disabled={pending}
          />
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Where</h2>

        <div className={styles.toggleRow}>
          <button
            type="button"
            role="switch"
            aria-checked={isPhysical}
            className={styles.switch}
            onClick={() => setIsPhysical((v) => !v)}
            disabled={pending}
            aria-label="Physical event"
          />
          <span className={styles.switchText}>
            <span className={styles.switchName}>
              {isPhysical ? "Physical event" : "Online event"}
            </span>
            <span className={styles.switchDesc}>
              Physical events show a venue, region, and campus on the feed.
            </span>
          </span>
        </div>
        {/* carries the toggle into the POST body */}
        <input type="hidden" name="is_physical" value={isPhysical ? "on" : ""} />

        {isPhysical && (
          <div className={styles.reveal}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${uid}-venue`}>
                  Venue
                </label>
                <input
                  id={`${uid}-venue`}
                  name="venue"
                  className={styles.input}
                  type="text"
                  maxLength={160}
                  disabled={pending}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${uid}-region`}>
                  Region
                </label>
                <input
                  id={`${uid}-region`}
                  name="region"
                  className={styles.input}
                  type="text"
                  placeholder="e.g. NCR"
                  maxLength={80}
                  disabled={pending}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${uid}-school`}>
                Campus (optional)
              </label>
              <select
                id={`${uid}-school`}
                name="school_id"
                className={styles.select}
                defaultValue=""
                disabled={pending}
              >
                <option value="">No specific campus</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short_name ? `${s.short_name} — ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>When &amp; size</h2>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-starts`}>
              Starts
            </label>
            <input
              id={`${uid}-starts`}
              name="starts_at"
              className={styles.input}
              type="datetime-local"
              required
              disabled={pending}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-ends`}>
              Ends (optional)
            </label>
            <input
              id={`${uid}-ends`}
              name="ends_at"
              className={styles.input}
              type="datetime-local"
              disabled={pending}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-cap`}>
            Capacity (optional)
          </label>
          <input
            id={`${uid}-cap`}
            name="capacity"
            className={styles.input}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            disabled={pending}
          />
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Details</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-desc`}>
            Description
          </label>
          <textarea
            id={`${uid}-desc`}
            name="description"
            className={styles.textarea}
            maxLength={4000}
            disabled={pending}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          data-loading={pending}
          disabled={pending}
        >
          Publish event
        </button>
        <Link href="/events" className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
