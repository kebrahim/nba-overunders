import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { DEMO_TEAMS, demoTeamRecords } from "@/lib/demo/data";
import { projectedWins } from "@/lib/domain/scoring";
import { getLastSyncedAt } from "@/lib/domain/sync-status";
import { TeamLogo } from "@/components/team-logo";
import { CONFERENCE_BY_DIVISION, DIVISIONS } from "@/lib/domain/divisions";
import type { Conference } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const CONFERENCES: Conference[] = ["East", "West"];

export default async function StandingsPage() {
  const profile = await getCurrentProfile();
  const lastSyncedAt = profile?.is_demo ? null : await getLastSyncedAt();

  let teams: {
    id: number;
    name: string;
    code: string;
    conference: string;
    division: string;
    win_total_line: number | null;
  }[];
  let records: { team_id: number; wins: number; losses: number; games_played: number }[];

  if (profile?.is_demo) {
    teams = DEMO_TEAMS;
    records = demoTeamRecords();
  } else {
    const supabase = await createClient();
    const [{ data: fetchedTeams }, { data: fetchedRecords }] = await Promise.all([
      supabase.from("teams").select("id, name, code, conference, division, win_total_line"),
      supabase.from("team_records").select("team_id, wins, losses, games_played"),
    ]);
    teams = fetchedTeams ?? [];
    records = fetchedRecords ?? [];
  }

  const recordByTeam = new Map(records.map((r) => [r.team_id, r]));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
        Standings
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Live records against each team&apos;s win-total line.
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

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {CONFERENCES.map((conference) => (
          <div key={conference} className="space-y-6">
            <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
              {conference}ern Conference
            </h2>
            {DIVISIONS.filter((d) => CONFERENCE_BY_DIVISION[d] === conference).map((division) => {
              const divisionTeams = teams
                .filter((t) => t.conference === conference && t.division === division)
                .sort((a, b) => {
                  const ra = recordByTeam.get(a.id);
                  const rb = recordByTeam.get(b.id);
                  return (rb?.wins ?? 0) - (ra?.wins ?? 0);
                });

              const topWins = recordByTeam.get(divisionTeams[0]?.id ?? -1)?.wins ?? 0;
              const leaderCount = divisionTeams.filter(
                (t) => topWins > 0 && (recordByTeam.get(t.id)?.wins ?? 0) === topWins,
              ).length;

              return (
                <div
                  key={division}
                  className="overflow-hidden rounded-lg border border-border bg-surface"
                >
                  <h3 className="border-b border-border bg-surface-2 px-3 py-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                    {division}
                  </h3>
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[42%]" />
                      <col className="w-[16%]" />
                      <col className="w-[18%]" />
                      <col className="w-[24%]" />
                    </colgroup>
                    <tbody>
                      {divisionTeams.map((team) => {
                        const record = recordByTeam.get(team.id);
                        const wins = record?.wins ?? 0;
                        const losses = record?.losses ?? 0;
                        const line = team.win_total_line;
                        const projected = projectedWins(wins, record?.games_played ?? 0);
                        const onPace =
                          line != null && projected != null
                            ? projected > line
                              ? "over"
                              : projected < line
                                ? "under"
                                : "push"
                            : null;
                        const isLeader = topWins > 0 && wins === topWins;

                        return (
                          <tr key={team.id} className="border-t border-border first:border-t-0">
                            <td className="px-3 py-1.5 font-medium">
                              <div className="flex items-center gap-2">
                                <TeamLogo code={team.code} name={team.name} size={20} />
                                {team.name}
                                {isLeader && (
                                  <span
                                    title={leaderCount > 1 ? "Tied for the division lead" : "Division leader"}
                                    className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
                                  >
                                    {leaderCount > 1 ? "T-1st" : "1st"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-ink-muted">
                              {wins}-{losses}
                            </td>
                            <td className="px-3 py-1.5 text-ink-muted">
                              {line != null ? `Line ${line}` : "No line set"}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {onPace && projected != null ? (
                                <span
                                  className={
                                    onPace === "over"
                                      ? "text-good"
                                      : onPace === "under"
                                        ? "text-bad"
                                        : "text-ink-muted"
                                  }
                                >
                                  {onPace === "push"
                                    ? "on the line"
                                    : `on pace: ${Math.round(projected)} (${onPace})`}
                                </span>
                              ) : (
                                line != null && <span className="text-ink-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
