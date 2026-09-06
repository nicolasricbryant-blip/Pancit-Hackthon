/**
 * Per-game config. Everything competitive in TAMBAYAN is game-scoped, so this
 * array is the single source of truth for the four supported titles. Adding a
 * fifth game is a new entry here — not a code change elsewhere.
 */

export type GameId = "mlbb" | "valorant" | "dota" | "codm";

export interface GameConfig {
  id: GameId;
  label: string;
  /** CSS custom-property name for this game's hue, e.g. "--game-mlbb". */
  hueToken: string;
  /** Rank bands for this title, ordered low → high. Drives the Rank Band filter. */
  rankTiers: string[];
}

export const GAMES: GameConfig[] = [
  {
    id: "mlbb",
    label: "MLBB",
    hueToken: "--game-mlbb",
    rankTiers: ["Mythic", "Mythical Glory", "Mythical Honor", "Mythical Immortal"],
  },
  {
    id: "valorant",
    label: "Valorant",
    hueToken: "--game-valorant",
    rankTiers: ["Diamond", "Ascendant", "Immortal", "Radiant"],
  },
  {
    id: "dota",
    label: "Dota 2",
    hueToken: "--game-dota",
    rankTiers: ["3k MMR", "4k MMR", "5k MMR", "6k+ MMR"],
  },
  {
    id: "codm",
    label: "CoDM",
    hueToken: "--game-codm",
    rankTiers: ["Pro", "Master", "Grand Master", "Legendary"],
  },
];

export const DEFAULT_GAME: GameId = "mlbb";

const GAME_IDS = GAMES.map((g) => g.id);

export function isGameId(value: string | null | undefined): value is GameId {
  return value != null && (GAME_IDS as string[]).includes(value);
}

export function getGame(id: GameId): GameConfig {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

/** Coerce an unknown searchParam value to a valid GameId (falls back to default). */
export function coerceGameId(value: string | string[] | undefined): GameId {
  const raw = Array.isArray(value) ? value[0] : value;
  return isGameId(raw) ? raw : DEFAULT_GAME;
}

/** Dim (low-chroma) hue token that pairs with a game's `hueToken`. */
export function dimToken(game: GameConfig): string {
  return `${game.hueToken}-dim`;
}
