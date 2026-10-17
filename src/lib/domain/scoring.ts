import type { Side } from "@/lib/supabase/types";

export const REGULAR_SEASON_GAMES_PER_TEAM = 82;
export const TOTAL_REGULAR_SEASON_GAMES = 1230;
export const BONUS_PER_WIN_MARGIN = 0.25;
export const MAX_BONUS_POINTS = 3;
export const POINTS_PER_DIVISION_PICK = 1;

export interface PickScore {
  resolved: boolean;
  correct: boolean | null;
  marginWins: number;
  bonusPoints: number;
  /** True once the bonus can't grow any further (season over, or capped). */
  bonusFinal: boolean;
  points: number;
}

/**
 * Scores a single draft pick. Mirrors the draft_pick_scores SQL view —
 * keep the two in sync if this formula changes.
 *
 * A pick resolves as soon as its side is mathematically locked: an Over
 * once wins pass the line, an Under once even winning out can't reach
 * it. The bonus uses the margin that's already guaranteed (for an Under,
 * measured against the most wins still possible), so it only ever grows
 * as games are played and equals the true margin once the season ends.
 */
export function scorePick(
  wins: number,
  gamesPlayed: number,
  winTotalLine: number,
  side: Side,
): PickScore {
  const remaining = Math.max(REGULAR_SEASON_GAMES_PER_TEAM - gamesPlayed, 0);
  const maxPossibleWins = wins + remaining;
  const overClinched = wins > winTotalLine;
  const underClinched = maxPossibleWins < winTotalLine;

  if (!overClinched && !underClinched) {
    return { resolved: false, correct: null, marginWins: 0, bonusPoints: 0, bonusFinal: false, points: 0 };
  }

  const correct = side === "over" ? overClinched : underClinched;
  if (!correct) {
    return { resolved: true, correct: false, marginWins: 0, bonusPoints: 0, bonusFinal: true, points: 0 };
  }

  const marginWins = Math.floor(side === "over" ? wins - winTotalLine : winTotalLine - maxPossibleWins);
  const bonusPoints = Math.min(marginWins * BONUS_PER_WIN_MARGIN, MAX_BONUS_POINTS);
  const bonusFinal = remaining === 0 || bonusPoints >= MAX_BONUS_POINTS;
  return { resolved: true, correct: true, marginWins, bonusPoints, bonusFinal, points: 1 + bonusPoints };
}

/**
 * Projects a team's final win total from its current pace, for display
 * only (the leaderboard's trend column, the standings page) — never used
 * for actual scoring.
 */
export function projectedWins(wins: number, gamesPlayed: number): number | null {
  if (gamesPlayed <= 0) return null;
  return (wins / gamesPlayed) * REGULAR_SEASON_GAMES_PER_TEAM;
}

/**
 * Projects the league-wide total-points pace across all 1,230 regular-
 * season games, for display only — relevant to the tiebreaker, which
 * guesses this same final total.
 */
export function projectedLeaguePoints(totalPoints: number, gamesFinal: number): number | null {
  if (gamesFinal <= 0) return null;
  return (totalPoints / gamesFinal) * TOTAL_REGULAR_SEASON_GAMES;
}

export type RecordNeeded =
  | { status: "won" }
  | { status: "lost" }
  // Over: needs at least `wins` of the remaining games (i.e. `wins`-`losses`
  // or better). Under: can win at most `wins` of them (`wins`-`losses` or
  // worse).
  | { status: "alive"; wins: number; losses: number; orBetter: boolean };

/**
 * The record a team needs over its remaining games for a pick to hit.
 * Lines are always x.5, so "beat the line" means floor(line) + 1 wins.
 */
export function recordNeeded(wins: number, gamesPlayed: number, winTotalLine: number, side: Side): RecordNeeded {
  const remaining = Math.max(REGULAR_SEASON_GAMES_PER_TEAM - gamesPlayed, 0);
  const overThreshold = Math.floor(winTotalLine) + 1; // fewest final wins that beat the line
  if (side === "over") {
    const needed = overThreshold - wins;
    if (needed <= 0) return { status: "won" };
    if (needed > remaining) return { status: "lost" };
    return { status: "alive", wins: needed, losses: remaining - needed, orBetter: true };
  }
  const allowed = Math.ceil(winTotalLine) - 1 - wins; // most more wins that stay under
  if (allowed < 0) return { status: "lost" };
  if (allowed >= remaining) return { status: "won" };
  return { status: "alive", wins: allowed, losses: remaining - allowed, orBetter: false };
}

/** "31-20 or better" / "20-31 or worse" / "Clinched" / "Eliminated". */
export function formatRecordNeeded(needed: RecordNeeded): string {
  if (needed.status === "won") return "Clinched";
  if (needed.status === "lost") return "Eliminated";
  return `${needed.wins}-${needed.losses} or ${needed.orBetter ? "better" : "worse"}`;
}
