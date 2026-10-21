import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import type { Division } from "@/lib/supabase/types";
import { picksLocked, PICKS_LOCK_AT } from "@/lib/domain/season";
import { DIVISIONS } from "@/lib/domain/divisions";
import {
  DEMO_DIVISION_PREDICTIONS,
  DEMO_PLAYERS,
  DEMO_TEAMS,
  DEMO_TIEBREAKER_PREDICTIONS,
  DEMO_VIEWER_ID,
  demoDraftPickScores,
} from "@/lib/demo/data";
import { TeamLogo } from "@/components/team-logo";
import { PICK_TREND_HEADERS, PickTrendCells } from "@/components/pick-trend";
import { DivisionForm } from "./division-form";
import { TiebreakerForm } from "./tiebreaker-form";

export const dynamic = "force-dynamic";

export default async function MyPicksPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <p>Sign in to see your picks.</p>
      </main>
    );
  }

  const isDemo = profile.is_demo;

  type PickScore = {
    pick_id: string;
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
  type Team = { id: number; name: string; code: string; conference: string; division: string };

  let pickScores: PickScore[];
  let teams: Team[];
  let existingDivisionPicks: Map<Division, number>;
  let tiebreakerGuess: number | null;
  let players: { id: string; display_name: string }[];
  let allDivisionPicks: { user_id: string; division: Division; predicted_team_id: number }[];

  if (isDemo) {
    pickScores = demoDraftPickScores(DEMO_VIEWER_ID);
    teams = DEMO_TEAMS;
    existingDivisionPicks = new Map(
      DEMO_DIVISION_PREDICTIONS.filter((p) => p.user_id === DEMO_VIEWER_ID).map((p) => [
        p.division,
        p.predicted_team_id,
      ]),
    );
    tiebreakerGuess = DEMO_TIEBREAKER_PREDICTIONS[DEMO_VIEWER_ID] ?? null;
    players = DEMO_PLAYERS;
    allDivisionPicks = DEMO_DIVISION_PREDICTIONS;
  } else {
    const supabase = await createClient();
    const [
      { data: fetchedPickScores },
      { data: fetchedTeams },
      { data: divisionPredictions },
      { data: tiebreaker },
      { data: fetchedPlayers },
    ] = await Promise.all([
      supabase
        .from("draft_pick_scores")
        .select(
          "pick_id, team_id, side, wins, losses, games_played, win_total_line, resolved, correct, bonus_final, points",
        )
        .eq("user_id", profile.id),
      supabase.from("teams").select("id, name, code, conference, division"),
      // RLS decides what's actually visible here: your own row always,
      // everyone's once picks lock, or always if you're commissioner.
      supabase.from("division_predictions").select("user_id, division, predicted_team_id"),
      supabase
        .from("tiebreaker_predictions")
        .select("points_guess")
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabase.from("profiles").select("id, display_name").eq("is_demo", false).order("display_name"),
    ]);
    pickScores = fetchedPickScores ?? [];
    teams = fetchedTeams ?? [];
    allDivisionPicks = (divisionPredictions ?? []) as typeof allDivisionPicks;
    existingDivisionPicks = new Map(
      allDivisionPicks.filter((p) => p.user_id === profile.id).map((p) => [p.division, p.predicted_team_id]),
    );
    tiebreakerGuess = tiebreaker?.points_guess ?? null;
    players = fetchedPlayers ?? [];
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const totalPoints = pickScores.reduce((sum, p) => sum + p.points, 0);
  const picksAreVisible = isDemo || picksLocked() || profile.is_commissioner;

  const missingDivisionCount = DIVISIONS.length - existingDivisionPicks.size;
  const divisionPicksComplete = missingDivisionCount === 0;
  const tiebreakerComplete = tiebreakerGuess != null;
  const somethingMissing = !isDemo && (!divisionPicksComplete || !tiebreakerComplete);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-12 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
          My Picks
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {totalPoints} draft point{totalPoints === 1 ? "" : "s"} so far.
        </p>

        {!isDemo && !profile.phone && (
          <p className="mt-4 text-sm text-ink-muted">
            Want draft turn alerts by text?{" "}
            <a href="/profile" className="text-accent hover:underline">
              Add your number on your profile
            </a>
            .
          </p>
        )}

        {somethingMissing && (
          <div className="mt-4 rounded-lg border-2 border-bad bg-bad/10 px-4 py-3">
            <p className="font-heading font-semibold tracking-wide text-bad uppercase">
              Action needed
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-bad">
              {!divisionPicksComplete && (
                <li>
                  {missingDivisionCount} of {DIVISIONS.length} division picks still missing
                </li>
              )}
              {!tiebreakerComplete && <li>Tiebreaker guess not submitted</li>}
            </ul>
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-ink-muted">Team</th>
                <th className="px-4 py-2 font-medium text-ink-muted">Side</th>
                <th className="px-4 py-2 font-medium text-ink-muted">Line</th>
                {PICK_TREND_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-2 font-medium text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pickScores.map((pick) => {
                const team = teamById.get(pick.team_id);
                return (
                  <tr key={pick.pick_id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {team && <TeamLogo code={team.code} name={team.name} size={20} />}
                        {team?.name ?? pick.team_id}
                      </div>
                    </td>
                    <td className="px-4 py-2 capitalize">{pick.side}</td>
                    <td className="px-4 py-2">{pick.win_total_line ?? "—"}</td>
                    <PickTrendCells pick={pick} cellClassName="px-4 py-2" />
                  </tr>
                );
              })}
              {pickScores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                    No picks yet — head to the draft.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            Division winners
          </h2>
          {isDemo ? null : divisionPicksComplete ? (
            <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">
              Complete
            </span>
          ) : (
            <span className="rounded-full bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad">
              {missingDivisionCount} missing
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          1 point per correct pick.{" "}
          {isDemo ? null : picksLocked() ? (
            <span className="text-bad">Locked.</span>
          ) : (
            <>
              Locks:{" "}
              {new Date(PICKS_LOCK_AT).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              ET.
            </>
          )}
        </p>
        <div className="mt-4">
          <DivisionForm
            teams={teams}
            existing={existingDivisionPicks}
            locked={isDemo || picksLocked()}
          />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Everyone&apos;s Picks
        </h2>
        {picksAreVisible ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">Who picked what for each division.</p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium text-ink-muted">Division</th>
                    {players.map((player) => (
                      <th key={player.id} className="px-3 py-2 font-medium text-ink-muted">
                        {player.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIVISIONS.map((division) => (
                    <tr key={division} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{division}</td>
                      {players.map((player) => {
                        const pick = allDivisionPicks.find(
                          (p) => p.user_id === player.id && p.division === division,
                        );
                        const team = pick ? teamById.get(pick.predicted_team_id) : null;
                        return (
                          <td key={player.id} className="px-3 py-1.5">
                            {team ? (
                              <div className="flex items-center gap-1.5">
                                <TeamLogo code={team.code} name={team.name} size={16} />
                                {team.name}
                              </div>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Everyone&apos;s picks will be visible here once they lock.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
            Tiebreaker
          </h2>
          {isDemo ? null : tiebreakerComplete ? (
            <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">
              Complete
            </span>
          ) : (
            <span className="rounded-full bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad">
              Not submitted
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Only used if the final standings are tied.{" "}
          {isDemo ? null : picksLocked() ? (
            <span className="text-bad">Locked.</span>
          ) : (
            <>
              Locks:{" "}
              {new Date(PICKS_LOCK_AT).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              ET.
            </>
          )}
        </p>
        <div className="mt-4">
          {isDemo ? (
            <p className="text-sm">
              Your guess: <span className="font-semibold text-accent">{tiebreakerGuess}</span>{" "}
              points
            </p>
          ) : (
            <TiebreakerForm existing={tiebreakerGuess} locked={picksLocked()} />
          )}
        </div>
      </div>
    </main>
  );
}
