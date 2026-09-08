"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getGame, type GameId } from "@/features/games/config";
import { createClient } from "@/lib/supabase/client";
import type { LobbyMode } from "./queries";
import styles from "@/app/lobbies/lobbies.module.css";

const TITLE_MAX = 80;

const MODE_OPTIONS: { value: LobbyMode; label: string }[] = [
  { value: "ranked", label: "Ranked" },
  { value: "casual", label: "Casual" },
  { value: "scrim_warmup", label: "Scrim warm-up" },
];

export function CreateLobbyForm({ game }: { game: GameId }) {
  const uid = useId();
  const router = useRouter();
  const cfg = useMemo(() => getGame(game), [game]);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<LobbyMode>("ranked");
  const [slots, setSlots] = useState(5);
  const [rankMin, setRankMin] = useState("");
  const [rankMax, setRankMax] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [micRequired, setMicRequired] = useState(false);
  const [autoFill, setAutoFill] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const t = title.trim();
    if (!t) {
      setError("Give the lobby a title.");
      return;
    }
    const s = Number(slots);
    if (!Number.isInteger(s) || s < 2 || s > 10) {
      setError("Slots must be a whole number between 2 and 10.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError("Your session expired — sign in again to host a lobby.");
      return;
    }

    const { data, error: insErr } = await supabase
      .from("lobbies")
      .insert({
        host_id: user.id,
        game_id: game,
        title: t,
        mode,
        rank_min: rankMin || null,
        rank_max: rankMax || null,
        slots_total: s,
        needed_roles: roles,
        mic_required: micRequired,
        auto_fill: autoFill,
      })
      .select("id")
      .single();

    if (insErr || !data) {
      setSubmitting(false);
      setError(insErr?.message ?? "Could not create the lobby. Try again.");
      return;
    }

    // Host membership + the matchmaker fire via DB triggers — nothing to do here.
    router.push(`/lobbies/${data.id}`);
  }

  const titleLeft = TITLE_MAX - title.trim().length;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Lobby</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-title`}>
            Title
          </label>
          <input
            id={`${uid}-title`}
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. Chill ${cfg.label} ranked grind`}
            maxLength={TITLE_MAX}
            required
            disabled={submitting}
          />
          <span className={styles.count}>{titleLeft} left</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-mode`}>
            Mode
          </label>
          <select
            id={`${uid}-mode`}
            className={styles.select}
            value={mode}
            onChange={(e) => setMode(e.target.value as LobbyMode)}
            disabled={submitting}
          >
            {MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-slots`}>
            Slots
          </label>
          <input
            id={`${uid}-slots`}
            className={styles.input}
            type="number"
            min={2}
            max={10}
            step={1}
            value={slots}
            onChange={(e) => setSlots(e.target.valueAsNumber || 0)}
            disabled={submitting}
          />
          <span className={styles.hint}>Between 2 and 10, including you.</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Requirements</h2>

        <div className={styles.rankRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-rankmin`}>
              Rank min
            </label>
            <select
              id={`${uid}-rankmin`}
              className={styles.select}
              value={rankMin}
              onChange={(e) => setRankMin(e.target.value)}
              disabled={submitting}
            >
              <option value="">Any</option>
              {cfg.rankTiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-rankmax`}>
              Rank max
            </label>
            <select
              id={`${uid}-rankmax`}
              className={styles.select}
              value={rankMax}
              onChange={(e) => setRankMax(e.target.value)}
              disabled={submitting}
            >
              <option value="">Any</option>
              {cfg.rankTiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className={styles.fieldset} disabled={submitting}>
          <legend className={styles.label}>Needed roles</legend>
          <div className={styles.checkGrid}>
            {cfg.roles.map((r) => (
              <label
                key={r}
                className={styles.check}
                data-on={roles.includes(r) || undefined}
              >
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => toggleRole(r)}
                />
                {r}
              </label>
            ))}
          </div>
          <span className={styles.hint}>
            Leave empty to let anyone fill the open slots.
          </span>
        </fieldset>

        <label
          className={styles.checkWide}
          data-on={micRequired || undefined}
        >
          <input
            type="checkbox"
            checked={micRequired}
            onChange={(e) => setMicRequired(e.target.checked)}
            disabled={submitting}
          />
          Mic required
        </label>

        <label className={styles.checkWide} data-on={autoFill || undefined}>
          <input
            type="checkbox"
            checked={autoFill}
            onChange={(e) => setAutoFill(e.target.checked)}
            disabled={submitting}
          />
          Let the matchmaker fill open roles
        </label>
      </section>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.formSubmit}
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Open lobby"}
        </button>
        <Link href={`/lobbies?game=${game}`} className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
