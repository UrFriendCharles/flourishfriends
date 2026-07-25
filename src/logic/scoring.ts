import type { GameSettings } from "../types";

export const BASE_POINTS = 100;

/** Points available after hint penalties: 100 / 75 / 50 / 25 (floor at 25). */
export function pointsAfterHints(hintsUsed: number): number {
  return Math.max(25, BASE_POINTS - hintsUsed * 25);
}

/**
 * Per-hint point penalty for TV-room hints: escalating and cumulative.
 * 1 hint = -5, 2 = -15, 3 = -30 (i.e. each successive hint costs 5/10/15).
 */
export const ROOM_HINT_STEPS = [5, 10, 15];
export const MAX_ROOM_HINTS = ROOM_HINT_STEPS.length;

export function hintPenalty(hintsUsed: number): number {
  let total = 0;
  for (let i = 0; i < Math.min(hintsUsed, ROOM_HINT_STEPS.length); i++) total += ROOM_HINT_STEPS[i];
  return total;
}

/** What the next hint (1-indexed) will cost, for showing "-N" on the button. */
export function nextHintCost(hintsUsed: number): number {
  return ROOM_HINT_STEPS[hintsUsed] ?? 0;
}

export function speedBonus(timeMs: number): number {
  if (timeMs <= 3000) return 50;
  if (timeMs <= 5000) return 25;
  return 0;
}

/** Bonus awarded when the streak REACHES this length with a correct answer. */
export function streakBonus(streak: number): number {
  if (streak === 10) return 250;
  if (streak === 5) return 100;
  if (streak === 3) return 50;
  return 0;
}

export function scoreCorrectAnswer(
  settings: GameSettings,
  hintsUsed: number,
  timeMs: number,
  newStreak: number
): number {
  let points = settings.mode === "learning" ? pointsAfterHints(hintsUsed) : BASE_POINTS;
  if (settings.speedBonusEnabled) points += speedBonus(timeMs);
  points += streakBonus(newStreak);
  return points;
}
