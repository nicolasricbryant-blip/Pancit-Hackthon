"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LobbyMemberView, LobbyStatus } from "./queries";
import { LobbyCrest } from "./LobbyCrest";
import styles from "@/app/lobbies/lobbies.module.css";

interface Props {
  members: LobbyMemberView[];
  hostId: string;
  viewerId: string | null;
  slotsTotal: number;
  lobbyId: string;
  status: LobbyStatus;
}

/**
 * Roster list. Client component so the host's inline "Remove" button can delete
 * a member row (RLS lets the host delete anyone) and refresh in place.
 */
export function LobbyRoster({
  members,
  hostId,
  viewerId,
  slotsTotal,
  lobbyId,
  status,
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage =
    viewerId != null &&
    viewerId === hostId &&
    status !== "closed" &&
    status !== "expired";

  const activeCount = members.filter((m) => m.state === "active").length;
  const emptySeats = Math.max(0, slotsTotal - activeCount);

  async function remove(profileId: string) {
    setBusyId(profileId);
    setError(null);
    const supabase = createClient();
    // `.delete().eq()` returns `error: null` even when zero rows matched — RLS
    // filtering it out, or the member already gone. Verify a row actually came
    // back before treating this as a successful removal.
    const { data, error: delErr } = await supabase
      .from("lobby_members")
      .delete()
      .eq("lobby_id", lobbyId)
      .eq("profile_id", profileId)
      .select("id")
      .maybeSingle();
    setBusyId(null);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    if (!data) {
      setError("Couldn't remove them — they may already be gone.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <ul className={styles.roster}>
        {members.map((m) => {
          const isHostRow = m.joinedVia === "host" || m.profileId === hostId;
          return (
            <li
              key={m.id}
              className={styles.rosterRow}
              data-pending={m.state === "pending" || undefined}
            >
              <LobbyCrest name={m.name} size={32} />
              <div className={styles.rosterWho}>
                <span className={styles.rosterName}>{m.name}</span>
                {m.handle && (
                  <span className={styles.rosterHandle}>@{m.handle}</span>
                )}
              </div>
              <span className={styles.rosterRole}>{m.role ?? "—"}</span>
              <div className={styles.rosterBadges}>
                {isHostRow && <span className={styles.badgeHost}>HOST</span>}
                {m.joinedVia === "auto" && (
                  <span className={styles.badgeAuto}>auto</span>
                )}
                {m.state === "pending" && (
                  <span className={styles.badgePending}>ready-check</span>
                )}
                {canManage && !isHostRow && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => remove(m.profileId)}
                    disabled={busyId === m.profileId}
                    aria-label={`Remove ${m.name} from the lobby`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}

        {Array.from({ length: emptySeats }).map((_, i) => (
          <li key={`open-${i}`} className={styles.rosterEmpty}>
            <span className={styles.rosterEmptyDot} aria-hidden />
            <span>Open slot</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
