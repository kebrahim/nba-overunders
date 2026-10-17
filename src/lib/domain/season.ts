// Opening tip-off of the 2026-27 regular season: Celtics at Pistons,
// 3:00 PM ET on Tuesday 10/20/2026 (EDT, UTC-4). Division-winner picks
// and tiebreaker guesses lock at this instant. Keep in sync with the
// matching timestamps in supabase/migrations/0001_init.sql.
export const PICKS_LOCK_AT = "2026-10-20T19:00:00Z";

export function picksLocked(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(PICKS_LOCK_AT).getTime();
}

// Contest weeks run Monday-to-Sunday in America/New_York local time, so
// the weekly text can go out Monday morning covering the week just
// finished. This is the Monday (ET calendar date) that starts week 1, the
// week of opening night.
export const SEASON_WEEK_1_START_ET_DATE = "2026-10-19";

// Generous upper bound: the regular season ends in mid-April (~week 26).
export const MAX_WEEK = 30;

export function easternCalendarDate(iso: string | Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}

/**
 * Returns the contest week number for a game's tip-off time. Not clamped
 * — values below 1 are preseason games.
 *
 * Compares ET *calendar dates*, not raw UTC milliseconds — a 10:30pm ET
 * West Coast tip-off on a Sunday is already Monday in UTC, which a naive
 * UTC-instant diff would misclassify into the next week. Diffing calendar
 * dates as UTC midnight of each date string also keeps this immune to
 * DST's 23/25-hour days.
 */
export function computeWeek(tipoffIso: string): number {
  const tipoffMs = new Date(`${easternCalendarDate(tipoffIso)}T00:00:00Z`).getTime();
  const startMs = new Date(`${SEASON_WEEK_1_START_ET_DATE}T00:00:00Z`).getTime();
  const dayDiff = Math.round((tipoffMs - startMs) / (24 * 60 * 60 * 1000));
  return Math.floor(dayDiff / 7) + 1;
}
