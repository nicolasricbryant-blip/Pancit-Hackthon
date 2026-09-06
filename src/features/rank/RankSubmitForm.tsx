"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameId } from "@/features/games/config";
import {
  composeRankLabel,
  isTextLike,
  selectOptions,
  type RankFormField,
  type RankValues,
} from "./form";
import { submitRank } from "./actions";
import styles from "./RankSubmitForm.module.css";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface Props {
  game: GameId;
  fields: RankFormField[];
  rankTiers: string[];
  initialValues: Record<string, string>;
}

type Phase = "idle" | "uploading" | "saving" | "error";

function extFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function RankSubmitForm({
  game,
  fields,
  rankTiers,
  initialValues,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [triedSubmit, setTriedSubmit] = useState(false);

  const busy = phase === "uploading" || phase === "saving";

  const filledCount = useMemo(
    () => fields.filter((f) => (values[f.key] ?? "").trim() !== "").length,
    [fields, values],
  );

  const previewLabel = useMemo(() => {
    const draft: RankValues = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim();
      if (!raw) continue;
      draft[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    return composeRankLabel(fields, draft);
  }, [fields, values]);

  function setField(key: string, next: string) {
    setValues((v) => ({ ...v, [key]: next }));
  }

  function onPickFile(next: File | null) {
    setFileError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.has(next.type)) {
      setFile(null);
      setFileError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setFile(null);
      setFileError(
        `That file is ${(next.size / 1024 / 1024).toFixed(1)} MB. Max is 5 MB.`,
      );
      return;
    }
    setFile(next);
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTriedSubmit(true);
    setFormError(null);

    if (filledCount === 0) {
      setFormError("Fill in at least one rank field.");
      return;
    }
    if (!file) {
      setFileError("A screenshot is required.");
      return;
    }

    // Build the typed value object + human label.
    const claimedRank: RankValues = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim();
      if (!raw) continue;
      if (f.type === "number") {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          setFormError(`"${f.label}" must be a number.`);
          return;
        }
        claimedRank[f.key] = n;
      } else {
        claimedRank[f.key] = raw;
      }
    }
    const rankLabel = composeRankLabel(fields, claimedRank);

    // 1 · upload screenshot to the caller's own folder.
    setPhase("uploading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("error");
      setFormError("Your session expired. Sign in again.");
      return;
    }

    const path = `${user.id}/${game}-${Date.now()}.${extFor(file)}`;
    const { data: up, error: upErr } = await supabase.storage
      .from("rank-proofs")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr || !up) {
      setPhase("error");
      setFormError(upErr?.message ?? "Screenshot upload failed. Try again.");
      return;
    }

    // 2 · persist the submission (server action redirects on success).
    setPhase("saving");
    const res = await submitRank({
      gameId: game,
      claimedRank,
      rankLabel,
      screenshotPath: up.path,
    });
    if (res?.error) {
      setPhase("error");
      setFormError(res.error);
    }
  }

  const btnLabel =
    phase === "uploading"
      ? "Uploading…"
      : phase === "saving"
        ? "Submitting…"
        : phase === "error"
          ? "Try again"
          : "Submit for review";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your rank</h2>

        {fields.length === 0 && (
          <p className={styles.hint}>
            No rank fields are configured for this game yet. Attach a screenshot
            and a reviewer will read it.
          </p>
        )}

        {fields.map((f) => {
          const id = `rank-f-${f.key}`;
          const opts = selectOptions(f, rankTiers);
          const value = values[f.key] ?? "";

          return (
            <div className={styles.field} key={f.key}>
              <label className={styles.label} htmlFor={id}>
                {f.label}
              </label>

              {opts && opts.length > 0 ? (
                <select
                  id={id}
                  className={styles.select}
                  value={value}
                  disabled={busy}
                  onChange={(e) => setField(f.key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  className={styles.input}
                  type={f.type === "number" ? "number" : "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  value={value}
                  disabled={busy}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={
                    isTextLike(f, rankTiers) && f.type === "select"
                      ? "Type it in"
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}

        {fields.length > 0 && (
          <p className={styles.preview}>
            Reads as <span className={styles.previewValue}>{previewLabel}</span>
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Proof screenshot</h2>

        <label
          className={styles.drop}
          data-has-file={!!file}
          data-invalid={triedSubmit && !file}
        >
          <input
            className={styles.fileInput}
            type="file"
            accept={ACCEPT}
            disabled={busy}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <span className={styles.dropTitle}>
            {file ? file.name : "Choose an image"}
          </span>
          <span className={styles.dropHint}>PNG, JPEG or WebP · up to 5 MB</span>
        </label>

        {fileError && (
          <span className={styles.fieldError} role="alert">
            {fileError}
          </span>
        )}
      </section>

      <button
        type="submit"
        className={styles.submit}
        disabled={busy}
        aria-busy={busy}
        data-loading={busy}
        data-error={phase === "error"}
      >
        {btnLabel}
      </button>
    </form>
  );
}
