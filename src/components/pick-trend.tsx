import {
  formatRecordNeeded,
  projectedWins,
  recordNeeded,
  REGULAR_SEASON_GAMES_PER_TEAM,
} from "@/lib/domain/scoring";
import type { Side } from "@/lib/supabase/types";

export interface TrendPick {
  side: string;
  wins: number;
  losses: number;
  games_played: number;
  win_total_line: number | null;
  resolved: boolean;
  correct?: boolean | null;
  bonus_final?: boolean;
  points: number;
}

/** Column headers matching PickTrendCells, in order. */
export const PICK_TREND_HEADERS = ["Record", "On pace", "Needs", "Points"];

/**
 * The record / trend / record-needed / points cells shared by the
 * leaderboard and My Picks tables. "On pace" projects the team's current
 * win rate over 82 games and says which side of the line that lands on;
 * "Needs" is the record the team has to go over its remaining games for
 * this pick to hit.
 */
export function PickTrendCells({ pick, cellClassName }: { pick: TrendPick; cellClassName: string }) {
  const side = pick.side as Side;
  const line = pick.win_total_line;
  const projected = projectedWins(pick.wins, pick.games_played);
  const paceSide = line != null && projected != null ? (projected > line ? "over" : "under") : null;
  const needed = line != null ? recordNeeded(pick.wins, pick.games_played, line, side) : null;

  return (
    <>
      <td className={`${cellClassName} whitespace-nowrap text-ink-muted`}>
        {pick.wins}-{pick.losses}{" "}
        <span className="text-xs">
          ({pick.games_played}/{REGULAR_SEASON_GAMES_PER_TEAM})
        </span>
      </td>
      <td className={`${cellClassName} whitespace-nowrap`}>
        {projected != null && paceSide ? (
          <span className={paceSide === side ? "text-good" : "text-bad"}>
            {Math.round(projected)} W{" "}
            <span className="text-xs uppercase">
              {paceSide === "over" ? "▲ over" : "▼ under"}
            </span>
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className={`${cellClassName} whitespace-nowrap`}>
        {needed ? (
          <span
            className={
              needed.status === "won" ? "text-good" : needed.status === "lost" ? "text-bad" : "text-ink-muted"
            }
          >
            {formatRecordNeeded(needed)}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className={`${cellClassName} whitespace-nowrap font-semibold text-accent`}>
        {pick.resolved ? (
          <span title={pick.bonus_final === false ? "Bonus can still grow" : undefined}>
            {pick.points}
            {pick.bonus_final === false ? "+" : ""}
          </span>
        ) : (
          <span className="font-normal text-ink-muted">pending</span>
        )}
      </td>
    </>
  );
}
