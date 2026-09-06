"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateBracket, removeEntrant, reportMatch } from "./actions";
import type { ActionResult } from "./types";
import styles from "./brackets.module.css";

interface EntrantLite {
  id: string;
  name: string;
  seed: number | null;
}

interface ReadyMatch {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
}

interface OtherMatch {
  id: string;
  label: string;
  line: string;
  status: string;
}

interface Props {
  slug: string;
  status: string;
  size: number;
  entrants: EntrantLite[];
  readyMatches: ReadyMatch[];
  otherMatches: OtherMatch[];
  championName: string | null;
}

export function ManageBracketClient({
  slug,
  status,
  size,
  entrants,
  readyMatches,
  otherMatches,
  championName,
}: Props) {
  if (status === "completed") {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Completed</h2>
        <p className={styles.champLine}>
          Champion: <strong>{championName ?? "—"}</strong>
        </p>
      </section>
    );
  }

  if (status === "cancelled") {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cancelled</h2>
        <p className={styles.readOnlyNote}>This tournament was cancelled.</p>
      </section>
    );
  }

  if (status === "registration") {
    return (
      <RegistrationPanel slug={slug} size={size} entrants={entrants} />
    );
  }

  return (
    <LivePanel
      slug={slug}
      readyMatches={readyMatches}
      otherMatches={otherMatches}
    />
  );
}

/* --------------------------------------------------------------------------- */

function RegistrationPanel({
  slug,
  size,
  entrants,
}: {
  slug: string;
  size: number;
  entrants: EntrantLite[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<ActionResult>, ok?: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (ok) setNotice(ok);
    router.refresh();
  }

  const full = entrants.length === size;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Registration</h2>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.formOk} role="status">
          {notice}
        </p>
      )}

      <p className={styles.countLine}>
        <span className={styles.countNum}>
          {entrants.length}/{size}
        </span>{" "}
        teams registered
      </p>

      <button
        type="button"
        className={styles.btn}
        data-loading={busy === "gen"}
        disabled={busy != null}
        onClick={() =>
          run("gen", () => generateBracket(slug), "Bracket generated.")
        }
      >
        Generate bracket
      </button>
      {!full && (
        <p className={styles.hint}>
          Needs exactly {size} teams to start ({entrants.length} so far).
        </p>
      )}

      {entrants.length > 0 && (
        <ul className={styles.entrantEditList}>
          {entrants.map((e) => (
            <li key={e.id} className={styles.entrantEditRow}>
              <span className={styles.entrantEditName}>
                {e.seed != null && (
                  <span className={styles.seedNum}>#{e.seed}</span>
                )}
                {e.name}
              </span>
              <button
                type="button"
                className={styles.smallBtnDanger}
                data-loading={busy === `rm-${e.id}`}
                disabled={busy != null}
                onClick={() =>
                  run(`rm-${e.id}`, () => removeEntrant(slug, e.id))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------------- */

function LivePanel({
  slug,
  readyMatches,
  otherMatches,
}: {
  slug: string;
  readyMatches: ReadyMatch[];
  otherMatches: OtherMatch[];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Report results</h2>

      {readyMatches.length === 0 ? (
        <p className={styles.readOnlyNote}>
          No matches ready to report. Winners advance automatically as results
          are confirmed.
        </p>
      ) : (
        <div className={styles.reportList}>
          {readyMatches.map((m) => (
            <ReportRow key={m.id} slug={slug} match={m} />
          ))}
        </div>
      )}

      {otherMatches.length > 0 && (
        <>
          <h3 className={styles.subTitle}>All matches</h3>
          <ul className={styles.matchLogList}>
            {otherMatches.map((m) => (
              <li key={m.id} className={styles.matchLogRow}>
                <span className={styles.matchLogLabel}>{m.label}</span>
                <span className={styles.matchLogLine}>{m.line}</span>
                <span className={styles.nodePill} data-status={m.status}>
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReportRow({ slug, match }: { slug: string; match: ReadyMatch }) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isInteger(na) || !Number.isInteger(nb) || na < 0 || nb < 0) {
      setError("Enter whole numbers, 0 or higher.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await reportMatch(slug, match.id, na, nb);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <form className={styles.reportRow} onSubmit={submit} noValidate>
      <div className={styles.reportLabel}>{match.label}</div>
      <div className={styles.reportGrid}>
        <label className={styles.reportSide}>
          <span className={styles.reportTeam}>{match.teamA}</span>
          <input
            className={`${styles.input} ${styles.scoreInput}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={a}
            onChange={(e) => setA(e.target.value)}
            disabled={busy}
            required
          />
        </label>
        <span className={styles.reportVs}>—</span>
        <label className={styles.reportSide}>
          <input
            className={`${styles.input} ${styles.scoreInput}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={b}
            onChange={(e) => setB(e.target.value)}
            disabled={busy}
            required
          />
          <span className={styles.reportTeam}>{match.teamB}</span>
        </label>
        <button
          type="submit"
          className={styles.smallBtn}
          data-loading={busy}
          disabled={busy}
        >
          Report
        </button>
      </div>
      {error && (
        <p className={styles.reportError} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
