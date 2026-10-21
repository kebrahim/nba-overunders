import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { TeamLogo } from "@/components/team-logo";
import { PICK_TREND_HEADERS, PickTrendCells } from "@/components/pick-trend";
import { DIVISIONS } from "@/lib/domain/divisions";
import { picksLocked } from "@/lib/domain/season";
import { projectedLeaguePoints, TOTAL_REGULAR_SEASON_GAMES } from "@/lib/domain/scoring";
import { getLastSyncedAt } from "@/lib/domain/sync-status";
import {
  DEMO_DIVISION_PREDICTIONS,
  DEMO_LEAGUE_TOTAL_POINTS,
  DEMO_TEAMS,
  DEMO_TIEBREAKER_PREDICTIONS,
  demoDraftPickScores,
  demoOverallLeaderboard,
} from "@/lib/demo/data";
import type { Division } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type PickScore = {
  pick_id: string;
  user_id: string;
  team_id: number;
  side: string;
  wins: number;
  losses: number;
  games_played: number;
  win_total_line: number | null;
  resolved: boolean;
  correct: boolean | null;
  bonus_final: boolean;
  points: number;
};
type Team = { id: number; name: string; code: string };
type DivisionPrediction = { user_id: string; division: Division; predicted_team_id: number };

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile();
  const lastSyncedAt = profile?.is_demo ? null : await getLastSyncedAt();

  let rows: { user_id: string; display_name: string; draft_points: number; division_points: number; total_points: number }[];
  let guessByUser: Map<string, number>;
  let leaguePoints: { total_points: number; games_final: number } | null;
  let pickScores: PickScore[];
  let teams: Team[];
  let divisionPredictions: DivisionPrediction[];

  const picksAreVisible = profile?.is_demo || picksLocked() || !!profile?.is_commissioner;

  if (profile?.is_demo) {
    rows = demoOverallLeaderboard();
    guessByUser = new Map(Object.entries(DEMO_TIEBREAKER_PREDICTIONS));
    leaguePoints = DEMO_LEAGUE_TOTAL_POINTS;
    pickScores = demoDraftPickScores();
    teams = DEMO_TEAMS;
    divisionPredictions = DEMO_DIVISION_PREDICTIONS;
  } else {
    const supabase = await createClient();
    const [
      { data: leaderboard },
      { data: tiebreakers },
      { data: fetchedLeaguePoints },
      { data: fetchedPickScores },
      { data: fetchedTeams },
      { data: fetchedDivisionPredictions },
    ] = await Promise.all([
      supabase
        .from("overall_leaderboard")
        .select("user_id, display_name, draft_points, division_points, total_points")
        .order("total_points", { ascending: false }),
      supabase.from("tiebreaker_predictions").select("user_id, points_guess"),
      supabase.from("league_total_points").select("total_points, games_final").single(),
      supabase
        .from("draft_pick_scores")
        .select(
          "pick_id, user_id, team_id, side, wins, losses, games_played, win_total_line, resolved, correct, bonus_final, points",
        )
        .order("pick_number"),
      supabase.from("teams").select("id, name, code"),
      // RLS decides what's actually visible here: your own row always,
      // everyone's once picks lock, or always if you're commissioner.
      supabase.from("division_predictions").select("user_id, division, predicted_team_id"),
    ]);
    rows = leaderboard ?? [];
    guessByUser = new Map((tiebreakers ?? []).map((t) => [t.user_id, t.points_guess]));
    leaguePoints = fetchedLeaguePoints;
    pickScores = fetchedPickScores ?? [];
    teams = fetchedTeams ?? [];
    divisionPredictions = (fetchedDivisionPredictions ?? []) as DivisionPrediction[];
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const divisionPicksByUser = new Map<string, Map<Division, number>>();
  for (const p of divisionPredictions) {
    const map = divisionPicksByUser.get(p.user_id) ?? new Map<Division, number>();
    map.set(p.division, p.predicted_team_id);
    divisionPicksByUser.set(p.user_id, map);
  }
  const picksByUser = new Map<string, PickScore[]>();
  for (const pick of pickScores) {
    const list = picksByUser.get(pick.user_id) ?? [];
    list.push(pick);
    picksByUser.set(pick.user_id, list);
  }

  const topScore = rows[0]?.total_points;
  const leadersTied = rows.filter((r) => r.total_points === topScore).length > 1;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
        Leaderboard
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Draft points + division bonus points. Updates as games go final.
      </p>
      {lastSyncedAt && (
        <p className="mt-1 text-xs text-ink-muted">
          Scores last synced:{" "}
          {new Date(lastSyncedAt).toLocaleString("en-US", {
            timeZone: "America/New_York",
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          ET
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-ink-muted">Player</th>
              <th className="px-4 py-2 font-medium text-ink-muted">Draft</th>
              <th className="px-4 py-2 font-medium text-ink-muted">Divisions</th>
              <th className="px-4 py-2 font-medium text-ink-muted">Total</th>
              {leadersTied && (
                <th className="px-4 py-2 font-medium text-ink-muted">Tiebreaker guess</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.user_id} className={i > 0 ? "border-t border-border" : ""}>
                <td className="px-4 py-2 font-medium">{row.display_name}</td>
                <td className="px-4 py-2">{row.draft_points}</td>
                <td className="px-4 py-2">{row.division_points}</td>
                <td className="px-4 py-2 font-semibold text-accent">{row.total_points}</td>
                {leadersTied && (
                  <td className="px-4 py-2 text-ink-muted">
                    {guessByUser.get(row.user_id) ?? "—"}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {leaguePoints && (
        <p className="mt-4 text-sm text-ink-muted">
          League-wide points scored so far: {leaguePoints.total_points} across{" "}
          {leaguePoints.games_final} completed games.
          {(() => {
            const pace = projectedLeaguePoints(leaguePoints.total_points, leaguePoints.games_final);
            return pace != null ? (
              <>
                {" "}
                On pace for{" "}
                <span className="font-semibold text-accent">{Math.round(pace)}</span> across all{" "}
                {TOTAL_REGULAR_SEASON_GAMES} games.
              </>
            ) : null;
          })()}
        </p>
      )}

      <div className="mt-12 space-y-6">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Everyone&apos;s Picks
        </h2>
        {!picksAreVisible && (
          <p className="text-sm text-ink-muted">
            Division picks will be shown here once they lock.
          </p>
        )}
        {rows.map((row) => {
          const picks = (picksByUser.get(row.user_id) ?? []).sort(
            (a, b) => (teamById.get(a.team_id)?.name ?? "").localeCompare(teamById.get(b.team_id)?.name ?? ""),
          );
          const divisionPicks = divisionPicksByUser.get(row.user_id);
          return (
            <div key={row.user_id} className="overflow-x-auto rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2">
                <p className="font-heading font-semibold tracking-wide uppercase">
                  {row.display_name}
                </p>
                <p className="text-sm text-ink-muted">
                  {row.draft_points} draft pt{row.draft_points === 1 ? "" : "s"}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr>
                    <th className="px-4 py-1.5 font-medium text-ink-muted">Team</th>
                    <th className="px-4 py-1.5 font-medium text-ink-muted">Side</th>
                    <th className="px-4 py-1.5 font-medium text-ink-muted">Line</th>
                    {PICK_TREND_HEADERS.map((h) => (
                      <th key={h} className="px-4 py-1.5 font-medium text-ink-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => {
                    const team = teamById.get(pick.team_id);
                    return (
                      <tr key={pick.pick_id} className="border-t border-border">
                        <td className="px-4 py-1.5 font-medium">
                          <div className="flex items-center gap-2">
                            {team && <TeamLogo code={team.code} name={team.name} size={18} />}
                            {team?.name ?? pick.team_id}
                          </div>
                        </td>
                        <td className="px-4 py-1.5 capitalize">{pick.side}</td>
                        <td className="px-4 py-1.5">{pick.win_total_line ?? "—"}</td>
                        <PickTrendCells pick={pick} cellClassName="px-4 py-1.5" />
                      </tr>
                    );
                  })}
                  {picks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-ink-muted">
                        No picks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {picksAreVisible && (
                <div className="border-t border-border px-4 py-2">
                  <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                    Division picks ({row.division_points} pt{row.division_points === 1 ? "" : "s"})
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {DIVISIONS.map((division) => {
                      const teamId = divisionPicks?.get(division);
                      const team = teamId != null ? teamById.get(teamId) : undefined;
                      return (
                        <span key={division} className="flex items-center gap-1.5">
                          <span className="text-ink-muted">{division}:</span>
                          {team ? (
                            <span className="flex items-center gap-1">
                              <TeamLogo code={team.code} name={team.name} size={14} />
                              {team.name}
                            </span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
