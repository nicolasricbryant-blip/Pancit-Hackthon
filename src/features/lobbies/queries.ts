import { createClient } from "@/lib/supabase/server";
import { coerceGameId, type GameId } from "@/features/games/config";

/* ---------------------------------------------------------------------------
   Shaped types. The DB rows carry raw enums as `text`; these narrow them for
   the UI. Everything the cards / detail view render is derived here so the
   components stay presentational.
   ------------------------------------------------------------------------- */

export type LobbyMode = "ranked" | "casual" | "scrim_warmup";
export type LobbyStatus = "open" | "full" | "closed" | "expired";
export type MemberState = "active" | "pending";
export type JoinedVia = "host" | "manual" | "auto";

export interface LobbyHost {
  name: string;
  handle: string | null;
  avatarUrl: string | null;
}

export interface LobbyListRow {
  id: string;
  game: GameId;
  title: string;
  mode: LobbyMode;
  rankMin: string | null;
  rankMax: string | null;
  slotsTotal: number;
  neededRoles: string[];
  micRequired: boolean;
  autoFill: boolean;
  status: LobbyStatus;
  host: LobbyHost;
  activeCount: number;
  pendingCount: number;
  filledRoles: string[];
}

export interface LobbyMemberView {
  id: string;
  profileId: string;
  role: string | null;
  state: MemberState;
  joinedVia: JoinedVia;
  readyBy: string | null;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
}

export interface LobbyDetail {
  id: string;
  game: GameId;
  hostId: string;
  title: string;
  mode: LobbyMode;
  rankMin: string | null;
  rankMax: string | null;
  slotsTotal: number;
  neededRoles: string[];
  micRequired: boolean;
  autoFill: boolean;
  status: LobbyStatus;
  createdAt: string;
  expiresAt: string;
  host: LobbyHost;
  members: LobbyMemberView[];
  activeCount: number;
  pendingCount: number;
  filledRoles: string[];
}

/* --- narrowing helpers --------------------------------------------------- */

function one<T>(v: T[] | T | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

const MODES: LobbyMode[] = ["ranked", "casual", "scrim_warmup"];
function toMode(raw: string | null): LobbyMode {
  return raw != null && (MODES as string[]).includes(raw)
    ? (raw as LobbyMode)
    : "casual";
}

const STATUSES: LobbyStatus[] = ["open", "full", "closed", "expired"];
function toStatus(raw: string | null): LobbyStatus {
  return raw != null && (STATUSES as string[]).includes(raw)
    ? (raw as LobbyStatus)
    : "open";
}

function toState(raw: string | null): MemberState {
  return raw === "pending" ? "pending" : "active";
}

function toJoinedVia(raw: string | null): JoinedVia {
  return raw === "host" || raw === "auto" ? raw : "manual";
}

interface ProfileRel {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

function shapeHost(rel: ProfileRel | null): LobbyHost {
  return {
    name: rel?.display_name ?? rel?.handle ?? "Unknown host",
    handle: rel?.handle ?? null,
    avatarUrl: rel?.avatar_url ?? null,
  };
}

interface MemberRel {
  id: string;
  profile_id: string;
  role: string | null;
  state: string | null;
  joined_via: string | null;
  ready_by?: string | null;
  profiles?: ProfileRel | ProfileRel[] | null;
}

function shapeMember(m: MemberRel): LobbyMemberView {
  const p = one(m.profiles ?? null);
  return {
    id: m.id,
    profileId: m.profile_id,
    role: m.role ?? null,
    state: toState(m.state),
    joinedVia: toJoinedVia(m.joined_via),
    readyBy: m.ready_by ?? null,
    name: p?.display_name ?? p?.handle ?? "Player",
    handle: p?.handle ?? null,
    avatarUrl: p?.avatar_url ?? null,
  };
}

/** Roles occupied by active members (non-null). */
function filledFrom(members: { role: string | null; state: MemberState }[]): string[] {
  return members
    .filter((m) => m.state === "active")
    .map((m) => m.role)
    .filter((r): r is string => Boolean(r));
}

/* --- queries ----------------------------------------------------------------
   `lobbies` and `lobby_members` are world-readable (RLS `using(true)`), so a
   plain anon-scoped select returns every open lobby regardless of sign-in.
   ------------------------------------------------------------------------- */

/**
 * Open / full lobbies for one game, newest first, shaped for the list feed.
 * Runs `expire_stale_lobbies()` first as housekeeping — it expires timed-out
 * lobbies and drops stale ready-checks before we read.
 */
export async function listLobbies(game: GameId): Promise<LobbyListRow[]> {
  const supabase = await createClient();

  await supabase.rpc("expire_stale_lobbies");

  const { data, error } = await supabase
    .from("lobbies")
    .select(
      "id, game_id, title, mode, rank_min, rank_max, slots_total, needed_roles, mic_required, auto_fill, status, created_at, profiles(handle, display_name, avatar_url), lobby_members(id, profile_id, role, state, joined_via)",
    )
    .eq("game_id", game)
    .in("status", ["open", "full"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row): LobbyListRow => {
    const members = ((row.lobby_members ?? []) as MemberRel[]).map(shapeMember);
    const active = members.filter((m) => m.state === "active");
    const pending = members.filter((m) => m.state === "pending");

    return {
      id: row.id,
      game: coerceGameId(row.game_id),
      title: row.title,
      mode: toMode(row.mode),
      rankMin: row.rank_min,
      rankMax: row.rank_max,
      slotsTotal: row.slots_total,
      neededRoles: row.needed_roles ?? [],
      micRequired: row.mic_required,
      autoFill: row.auto_fill,
      status: toStatus(row.status),
      host: shapeHost(one(row.profiles as ProfileRel | ProfileRel[] | null)),
      activeCount: active.length,
      pendingCount: pending.length,
      filledRoles: filledFrom(active),
    };
  });
}

/** One lobby with its host + full member list, or null when not found. */
export async function getLobby(id: string): Promise<LobbyDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lobbies")
    .select(
      "id, game_id, host_id, title, mode, rank_min, rank_max, slots_total, needed_roles, mic_required, auto_fill, status, created_at, expires_at, profiles(handle, display_name, avatar_url), lobby_members(id, profile_id, role, state, joined_via, ready_by, created_at, profiles(handle, display_name, avatar_url))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const members = ((data.lobby_members ?? []) as MemberRel[])
    .map(shapeMember)
    .sort((a, b) => rosterRank(a, data.host_id) - rosterRank(b, data.host_id));

  const active = members.filter((m) => m.state === "active");
  const pending = members.filter((m) => m.state === "pending");

  return {
    id: data.id,
    game: coerceGameId(data.game_id),
    hostId: data.host_id,
    title: data.title,
    mode: toMode(data.mode),
    rankMin: data.rank_min,
    rankMax: data.rank_max,
    slotsTotal: data.slots_total,
    neededRoles: data.needed_roles ?? [],
    micRequired: data.mic_required,
    autoFill: data.auto_fill,
    status: toStatus(data.status),
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    host: shapeHost(one(data.profiles as ProfileRel | ProfileRel[] | null)),
    members,
    activeCount: active.length,
    pendingCount: pending.length,
    filledRoles: filledFrom(active),
  };
}

/** Host first, then active members, then pending ready-checks last. */
function rosterRank(m: LobbyMemberView, hostId: string): number {
  if (m.joinedVia === "host" || m.profileId === hostId) return 0;
  return m.state === "active" ? 1 : 2;
}
