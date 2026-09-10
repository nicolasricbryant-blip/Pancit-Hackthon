"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { LobbyStatus } from "./queries";
import styles from "@/app/lobbies/lobbies.module.css";

interface Membership {
  state: "active" | "pending";
  role: string | null;
  readyBy: string | null;
}

interface Props {
  lobbyId: string;
  status: LobbyStatus;
  slotsTotal: number;
  activeCount: number;
  viewerId: string | null;
  viewerMembership: Membership | null;
  isHost: boolean;
}

/**
 * All viewer-facing lobby actions in one client island: join / leave, the
 * pending ready-check with countdown, and the host's close control. Live
 * state comes from a Supabase Realtime subscription on `lobby_members` +
 * `lobbies` for this lobby (roster joins/leaves, host close, the
 * open↔full auto-sync trigger) rather than a poll.
 */
export function LobbyActions({
  lobbyId,
  status,
  viewerId,
  viewerMembership,
  isHost,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_members",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, router]);

  const refresh = () => router.refresh();

  async function run(fn: () => Promise<{ message: string } | null>) {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  async function join() {
    if (!viewerId) return;
    await run(async () => {
      const supabase = createClient();
      const { error: e } = await supabase.from("lobby_members").insert({
        lobby_id: lobbyId,
        profile_id: viewerId,
        joined_via: "manual",
      });
      return e ? { message: "Lobby just filled or closed." } : null;
    });
  }

  async function leave() {
    if (!viewerId) return;
    await run(async () => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("lobby_members")
        .delete()
        .eq("lobby_id", lobbyId)
        .eq("profile_id", viewerId);
      return e ? { message: e.message } : null;
    });
  }

  async function accept() {
    await run(async () => {
      const supabase = createClient();
      const { error: e } = await supabase.rpc("lobby_accept_match", {
        p_lobby: lobbyId,
      });
      return e ? { message: e.message } : null;
    });
  }

  async function closeLobby() {
    await run(async () => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("lobbies")
        .update({ status: "closed" })
        .eq("id", lobbyId);
      return e ? { message: e.message } : null;
    });
  }

  let body: React.ReactNode;

  if (viewerId == null) {
    body = (
      <Link
        className={styles.actionBtn}
        href={`/sign-in?next=/lobbies/${lobbyId}`}
      >
        Sign in to join
      </Link>
    );
  } else if (isHost) {
    const done = status === "closed" || status === "expired";
    body = (
      <button
        type="button"
        className={styles.actionDanger}
        onClick={closeLobby}
        disabled={busy || done}
      >
        {status === "closed"
          ? "Lobby closed"
          : status === "expired"
            ? "Lobby expired"
            : "Close lobby"}
      </button>
    );
  } else if (viewerMembership?.state === "pending") {
    body = (
      <ReadyCheck
        role={viewerMembership.role}
        readyBy={viewerMembership.readyBy}
        busy={busy}
        onReady={accept}
        onDecline={leave}
        onRefresh={refresh}
      />
    );
  } else if (viewerMembership?.state === "active") {
    body = (
      <button
        type="button"
        className={styles.actionBtn}
        onClick={leave}
        disabled={busy}
      >
        Leave lobby
      </button>
    );
  } else if (status === "open") {
    body = (
      <button
        type="button"
        className={styles.actionPrimary}
        onClick={join}
        disabled={busy}
      >
        Join lobby
      </button>
    );
  } else {
    body = (
      <button type="button" className={styles.actionBtn} disabled>
        {status === "full" ? "Lobby full" : "Closed"}
      </button>
    );
  }

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionRow}>{body}</div>
      <button
        type="button"
        className={styles.refreshBtn}
        onClick={refresh}
        disabled={busy}
      >
        Refresh
      </button>
      {error && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

interface ReadyCheckProps {
  role: string | null;
  readyBy: string | null;
  busy: boolean;
  onReady: () => void;
  onDecline: () => void;
  onRefresh: () => void;
}

function ReadyCheck({
  role,
  readyBy,
  busy,
  onReady,
  onDecline,
  onRefresh,
}: ReadyCheckProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = readyBy ? new Date(readyBy).getTime() : null;
  const remainMs = target != null ? target - now : null;
  const expired = remainMs != null && remainMs <= 0;

  return (
    <div className={styles.readyCheck}>
      <p className={styles.readyText}>
        You were matched as {role ?? "a player"}.
      </p>
      <p className={styles.readyClock} aria-live="polite">
        {remainMs == null
          ? "Ready-check pending"
          : expired
            ? "Ready-check expired"
            : `Respond in ${fmtClock(remainMs)}`}
      </p>
      {expired ? (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onRefresh}
        >
          Refresh
        </button>
      ) : (
        <div className={styles.readyRow}>
          <button
            type="button"
            className={styles.actionPrimary}
            onClick={onReady}
            disabled={busy}
          >
            Ready
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onDecline}
            disabled={busy}
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
