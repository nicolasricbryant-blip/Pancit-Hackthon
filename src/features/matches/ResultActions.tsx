"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./matches.module.css";
import {
  reportResultAction,
  confirmResultAction,
  disputeResultAction,
} from "./actions";

type Mode = "report" | "confirm";

interface Props {
  matchId: string;
  mode: Mode;
  teamALabel: string;
  teamBLabel: string;
  /** Prefill for the report form (re-report from disputed). */
  initialScoreA?: number | null;
  initialScoreB?: number | null;
  /** Show the Confirm button (false when the viewer's side already confirmed). */
  canConfirm?: boolean;
}

export function ResultActions({
  matchId,
  mode,
  teamALabel,
  teamBLabel,
  initialScoreA,
  initialScoreB,
  canConfirm = true,
}: Props) {
  const router = useRouter();
  const [a, setA] = useState(initialScoreA != null ? String(initialScoreA) : "");
  const [b, setB] = useState(initialScoreB != null ? String(initialScoreB) : "");
  const [busy, setBusy] = useState<null | "report" | "confirm" | "dispute">(null);
  const [state, setState] = useState<"idle" | "error" | "success">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  function done(res: { ok: boolean; error?: string; message?: string }) {
    setBusy(null);
    if (!res.ok) {
      setState("error");
      setMsg(res.error ?? "Something went wrong.");
      return;
    }
    setState("success");
    setMsg(res.message ?? "Done.");
    router.refresh();
  }

  async function onReport(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isInteger(na) || !Number.isInteger(nb) || na < 0 || nb < 0) {
      setState("error");
      setMsg("Enter whole numbers, 0 or higher, for both scores.");
      return;
    }
    setBusy("report");
    setState("idle");
    setMsg(null);
    done(await reportResultAction(matchId, na, nb));
  }

  async function onConfirm() {
    if (busy) return;
    setBusy("confirm");
    setState("idle");
    setMsg(null);
    done(await confirmResultAction(matchId));
  }

  async function onDispute() {
    if (busy) return;
    setBusy("dispute");
    setState("idle");
    setMsg(null);
    done(await disputeResultAction(matchId));
  }

  const banner = msg && (
    <div
      className={state === "error" ? styles.formError : styles.formOk}
      role={state === "error" ? "alert" : "status"}
    >
      {msg}
    </div>
  );

  if (mode === "report") {
    return (
      <form className={styles.form} onSubmit={onReport} noValidate>
        {banner}
        <div className={styles.fieldRow}>
          <div className={styles.field} style={{ flex: "0 0 auto" }}>
            <label className={styles.label} htmlFor="rr-a">{teamALabel}</label>
            <input
              id="rr-a"
              className={`${styles.input} ${styles.scoreInput}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={a}
              onChange={(e) => setA(e.target.value)}
              disabled={busy != null}
              required
            />
          </div>
          <div className={styles.field} style={{ flex: "0 0 auto" }}>
            <label className={styles.label} htmlFor="rr-b">{teamBLabel}</label>
            <input
              id="rr-b"
              className={`${styles.input} ${styles.scoreInput}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={b}
              onChange={(e) => setB(e.target.value)}
              disabled={busy != null}
              required
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.btn}
            data-loading={busy === "report"}
            data-state={state === "idle" ? undefined : state}
            disabled={busy != null}
          >
            Report result
          </button>
        </div>
      </form>
    );
  }

  // mode === "confirm"
  return (
    <div className={styles.form}>
      {banner}
      <div className={styles.actions}>
        {canConfirm && (
          <button
            type="button"
            className={styles.btn}
            data-loading={busy === "confirm"}
            data-state={state === "idle" ? undefined : state}
            disabled={busy != null}
            onClick={onConfirm}
          >
            Confirm result
          </button>
        )}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          data-loading={busy === "dispute"}
          disabled={busy != null}
          onClick={onDispute}
        >
          Dispute
        </button>
      </div>
    </div>
  );
}
