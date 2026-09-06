"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./matches.module.css";
import { SERIES_OPTIONS, type Ruleset } from "./types";
import { updateRulesetAction } from "./actions";

interface Props {
  matchId: string;
  initial: Ruleset;
}

/** Edit the agreed ruleset while the match is still 'booked'. */
export function RulesetForm({ matchId, initial }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [mapsCsv, setMapsCsv] = useState(initial.maps.join(", "));
  const [series, setSeries] = useState(initial.series || SERIES_OPTIONS[2]);
  const [server, setServer] = useState(initial.server);

  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "error" | "success">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setState("idle");
    setMsg(null);

    const res = await updateRulesetAction(matchId, { mode, mapsCsv, series, server });
    setBusy(false);

    if (!res.ok) {
      setState("error");
      setMsg(res.error);
      return;
    }
    setState("success");
    setMsg(res.message ?? "Saved.");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {msg && (
        <div
          className={state === "error" ? styles.formError : styles.formOk}
          role={state === "error" ? "alert" : "status"}
        >
          {msg}
        </div>
      )}

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rs-mode">Mode</label>
          <input
            id="rs-mode"
            className={styles.input}
            type="text"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            placeholder="competitive"
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rs-series">Series</label>
          <select
            id="rs-series"
            className={styles.input}
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            disabled={busy}
          >
            {SERIES_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rs-server">Server</label>
          <input
            id="rs-server"
            className={styles.input}
            type="text"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="PH"
            disabled={busy}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="rs-maps">Maps</label>
        <input
          id="rs-maps"
          className={styles.input}
          type="text"
          value={mapsCsv}
          onChange={(e) => setMapsCsv(e.target.value)}
          placeholder="Ascent, Haven, Split"
          disabled={busy}
        />
        <span className={styles.hint}>Comma-separated. Leave blank for a draft/pick phase.</span>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.btn}
          data-loading={busy}
          data-state={state === "idle" ? undefined : state}
          disabled={busy}
        >
          Save ruleset
        </button>
      </div>
    </form>
  );
}
