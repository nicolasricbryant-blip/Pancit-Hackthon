"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/profile/profile.module.css";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/** First char of the first two words, uppercased; single word → first two chars. */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AvatarUpload({
  userId,
  initialUrl,
  displayName,
}: {
  userId: string;
  initialUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [err, setErr] = useState<string | null>(null);

  const uploading = status === "uploading";

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);

    if (!ALLOWED.includes(file.type)) {
      setErr("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Image must be 2 MB or smaller.");
      return;
    }

    setStatus("uploading");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setStatus("idle");
      setErr(upErr.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // `.update().eq()` returns `error: null` even when zero rows matched.
    // Verify a row actually came back before showing the new photo as saved —
    // otherwise the file is uploaded to storage but the profile never points
    // at it, and the UI claims success anyway.
    const { data: savedProfile, error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (dbErr) {
      setStatus("idle");
      setErr(dbErr.message);
      return;
    }
    if (!savedProfile) {
      setStatus("idle");
      setErr("Couldn't save your photo — sign out and back in, then try again.");
      return;
    }

    setUrl(publicUrl);
    setStatus("idle");
    router.refresh();
  }

  async function onRemove() {
    setErr(null);
    setStatus("uploading");
    const supabase = createClient();
    const { data: savedProfile, error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    setStatus("idle");
    if (dbErr) {
      setErr(dbErr.message);
      return;
    }
    if (!savedProfile) {
      setErr("Couldn't remove your photo — sign out and back in, then try again.");
      return;
    }
    setUrl(null);
    router.refresh();
  }

  return (
    <div className={styles.avatar}>
      <div className={styles.avatarCircle}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.monogram} aria-hidden>
            {monogram(displayName)}
          </span>
        )}
      </div>

      <div className={styles.avatarActions}>
        <button
          type="button"
          className={styles.changeBtn}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
        >
          {uploading && <span className={styles.spinner} aria-hidden />}
          {uploading ? "Uploading…" : "Change photo"}
        </button>

        {url && !uploading && (
          <button type="button" className={styles.removeBtn} onClick={onRemove}>
            Remove
          </button>
        )}

        {err && (
          <span className={styles.err} role="alert">
            {err}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.fileInput}
        onChange={onPick}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
