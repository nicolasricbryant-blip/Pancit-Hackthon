import type { GameId } from "@/features/games/config";

export type TimeWindow = "Tonight" | "This Week" | "Weekend" | "Custom";

export type ScrimFormat = "BO1" | "BO2" | "BO3" | "BO5" | "Scrim Block";

export const TIME_WINDOWS: TimeWindow[] = [
  "Tonight",
  "This Week",
  "Weekend",
  "Custom",
];

export const SCRIM_FORMATS: ScrimFormat[] = [
  "BO1",
  "BO2",
  "BO3",
  "BO5",
  "Scrim Block",
];

export interface ScrimListing {
  id: string;
  game: GameId;
  teamName: string;
  school: string;
  verified: boolean;
  /** Native TAMBAYAN rating for this team in this game. Range ~1400–2100. */
  rating: number;
  /** Reliability score as a percentage. Range 70–99. */
  reliability: number;
  /** Human-readable availability window, e.g. "Tonight 8:00–11:00 PM". */
  availability: string;
  /** Bucket the availability falls in — drives the Time Window filter. */
  timeWindow: Exclude<TimeWindow, "Custom">;
  format: ScrimFormat;
  /** Display string for the rank spread, e.g. "Mythic–Mythical Glory". */
  rankBand: string;
  /** Tiers this listing spans, matched against the Rank Band filter value. */
  rankTiers: string[];
}
