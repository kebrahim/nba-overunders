// A fully self-contained, fake dataset for the read-only demo account.
// Nothing here touches Supabase — every page checks profile.is_demo and,
// if true, renders these fixtures instead of querying the real database.
// Numbers are invented but internally consistent (pick scores are
// computed with the same `scorePick` function the real app uses, etc.)
// so the demo looks and behaves like a season in progress.

import { scorePick, POINTS_PER_DIVISION_PICK } from "@/lib/domain/scoring";
import type { Conference, Division, Side } from "@/lib/supabase/types";

export interface DemoTeam {
  id: number;
  name: string;
  code: string;
  conference: Conference;
  division: Division;
  win_total_line: number;
}

export interface DemoPlayer {
  id: string;
  display_name: string;
}

export const DEMO_PLAYERS: DemoPlayer[] = [
  { id: "demo-alex", display_name: "Demo Alex" },
  { id: "demo-jordan", display_name: "Demo Jordan" },
  { id: "demo-sam", display_name: "Demo Sam" },
  { id: "demo-riley", display_name: "Demo Riley" },
  { id: "demo-casey", display_name: "Demo Casey" },
];

// The player the demo login "is" when viewing /my-picks.
export const DEMO_VIEWER_ID = "demo-alex";

export const DEMO_TEAMS: DemoTeam[] = [
  { id: 1, name: "Boston Celtics", code: "BOS", conference: "East", division: "Atlantic", win_total_line: 51.5 },
  { id: 2, name: "Brooklyn Nets", code: "BKN", conference: "East", division: "Atlantic", win_total_line: 24.5 },
  { id: 3, name: "New York Knicks", code: "NYK", conference: "East", division: "Atlantic", win_total_line: 52.5 },
  { id: 4, name: "Philadelphia 76ers", code: "PHI", conference: "East", division: "Atlantic", win_total_line: 50.5 },
  { id: 5, name: "Toronto Raptors", code: "TOR", conference: "East", division: "Atlantic", win_total_line: 45.5 },
  { id: 6, name: "Chicago Bulls", code: "CHI", conference: "East", division: "Central", win_total_line: 29.5 },
  { id: 7, name: "Cleveland Cavaliers", code: "CLE", conference: "East", division: "Central", win_total_line: 48.5 },
  { id: 8, name: "Detroit Pistons", code: "DET", conference: "East", division: "Central", win_total_line: 49.5 },
  { id: 9, name: "Indiana Pacers", code: "IND", conference: "East", division: "Central", win_total_line: 44.5 },
  { id: 10, name: "Milwaukee Bucks", code: "MIL", conference: "East", division: "Central", win_total_line: 26.5 },
  { id: 11, name: "Atlanta Hawks", code: "ATL", conference: "East", division: "Southeast", win_total_line: 43.5 },
  { id: 12, name: "Charlotte Hornets", code: "CHA", conference: "East", division: "Southeast", win_total_line: 39.5 },
  { id: 13, name: "Miami Heat", code: "MIA", conference: "East", division: "Southeast", win_total_line: 46.5 },
  { id: 14, name: "Orlando Magic", code: "ORL", conference: "East", division: "Southeast", win_total_line: 43.5 },
  { id: 15, name: "Washington Wizards", code: "WAS", conference: "East", division: "Southeast", win_total_line: 35.5 },
  { id: 16, name: "Denver Nuggets", code: "DEN", conference: "West", division: "Northwest", win_total_line: 49.5 },
  { id: 17, name: "Minnesota Timberwolves", code: "MIN", conference: "West", division: "Northwest", win_total_line: 48.5 },
  { id: 18, name: "Oklahoma City Thunder", code: "OKC", conference: "West", division: "Northwest", win_total_line: 60.5 },
  { id: 19, name: "Portland Trail Blazers", code: "POR", conference: "West", division: "Northwest", win_total_line: 43.5 },
  { id: 20, name: "Utah Jazz", code: "UTA", conference: "West", division: "Northwest", win_total_line: 35.5 },
  { id: 21, name: "Golden State Warriors", code: "GSW", conference: "West", division: "Pacific", win_total_line: 39.5 },
  { id: 22, name: "LA Clippers", code: "LAC", conference: "West", division: "Pacific", win_total_line: 27.5 },
  { id: 23, name: "Los Angeles Lakers", code: "LAL", conference: "West", division: "Pacific", win_total_line: 46.5 },
  { id: 24, name: "Phoenix Suns", code: "PHX", conference: "West", division: "Pacific", win_total_line: 40.5 },
  { id: 25, name: "Sacramento Kings", code: "SAC", conference: "West", division: "Pacific", win_total_line: 20.5 },
  { id: 26, name: "Dallas Mavericks", code: "DAL", conference: "West", division: "Southwest", win_total_line: 34.5 },
  { id: 27, name: "Houston Rockets", code: "HOU", conference: "West", division: "Southwest", win_total_line: 48.5 },
  { id: 28, name: "Memphis Grizzlies", code: "MEM", conference: "West", division: "Southwest", win_total_line: 28.5 },
  { id: 29, name: "New Orleans Pelicans", code: "NOP", conference: "West", division: "Southwest", win_total_line: 27.5 },
  { id: 30, name: "San Antonio Spurs", code: "SAS", conference: "West", division: "Southwest", win_total_line: 59.5 },
];

const teamByCode = new Map(DEMO_TEAMS.map((t) => [t.code, t]));

// The demo shows a season in progress (66 of 82 games played) so the
// leaderboard's trend and record-needed columns have something to show.
const DEMO_GAMES_PLAYED = 66;

// Fake win totals through DEMO_GAMES_PLAYED games.
const DEMO_WINS: Record<string, number> = {
  BOS: 44, BKN: 16, NYK: 45, PHI: 36, TOR: 38,
  CHI: 31, CLE: 41, DET: 43, IND: 32, MIL: 28,
  ATL: 37, CHA: 30, MIA: 33, ORL: 40, WAS: 19,
  DEN: 42, MIN: 36, OKC: 52, POR: 34, UTA: 25,
  GSW: 35, LAC: 29, LAL: 40, PHX: 29, SAC: 13,
  DAL: 36, HOU: 42, MEM: 20, NOP: 22, SAS: 50,
};

export function demoTeamRecords() {
  return DEMO_TEAMS.map((team) => {
    const wins = DEMO_WINS[team.code] ?? 0;
    return {
      team_id: team.id,
      wins,
      losses: DEMO_GAMES_PLAYED - wins,
      games_played: DEMO_GAMES_PLAYED,
    };
  });
}

export const DEMO_DRAFT_SESSION = {
  id: "demo-session",
  status: "completed" as const,
  snake_order: DEMO_PLAYERS.map((p) => p.id),
  current_pick_index: 30,
  total_rounds: 6,
  current_round: 6,
};

interface DemoPickInput {
  pickNumber: number;
  playerId: string;
  teamCode: string;
  side: Side;
}

// Snake order [Alex, Jordan, Sam, Riley, Casey]; 6 rounds, 30 of the 60
// possible (team, side) slots drafted — same shape as a real draft.
const DEMO_PICK_INPUTS: DemoPickInput[] = [
  { pickNumber: 1, playerId: "demo-alex", teamCode: "OKC", side: "over" },
  { pickNumber: 2, playerId: "demo-jordan", teamCode: "SAC", side: "under" },
  { pickNumber: 3, playerId: "demo-sam", teamCode: "SAS", side: "over" },
  { pickNumber: 4, playerId: "demo-riley", teamCode: "BKN", side: "under" },
  { pickNumber: 5, playerId: "demo-casey", teamCode: "WAS", side: "under" },
  { pickNumber: 6, playerId: "demo-casey", teamCode: "NYK", side: "over" },
  { pickNumber: 7, playerId: "demo-riley", teamCode: "PHX", side: "under" },
  { pickNumber: 8, playerId: "demo-sam", teamCode: "DET", side: "over" },
  { pickNumber: 9, playerId: "demo-jordan", teamCode: "MIA", side: "under" },
  { pickNumber: 10, playerId: "demo-alex", teamCode: "CHI", side: "over" },
  { pickNumber: 11, playerId: "demo-alex", teamCode: "IND", side: "under" },
  { pickNumber: 12, playerId: "demo-jordan", teamCode: "DAL", side: "over" },
  { pickNumber: 13, playerId: "demo-sam", teamCode: "BOS", side: "over" },
  { pickNumber: 14, playerId: "demo-riley", teamCode: "LAC", side: "over" },
  { pickNumber: 15, playerId: "demo-casey", teamCode: "MIL", side: "under" },
  { pickNumber: 16, playerId: "demo-casey", teamCode: "HOU", side: "over" },
  { pickNumber: 17, playerId: "demo-riley", teamCode: "PHI", side: "under" },
  { pickNumber: 18, playerId: "demo-sam", teamCode: "MIN", side: "under" },
  { pickNumber: 19, playerId: "demo-jordan", teamCode: "GSW", side: "over" },
  { pickNumber: 20, playerId: "demo-alex", teamCode: "LAL", side: "over" },
  { pickNumber: 21, playerId: "demo-alex", teamCode: "ORL", side: "over" },
  { pickNumber: 22, playerId: "demo-jordan", teamCode: "DEN", side: "under" },
  { pickNumber: 23, playerId: "demo-sam", teamCode: "CHA", side: "under" },
  { pickNumber: 24, playerId: "demo-riley", teamCode: "TOR", side: "over" },
  { pickNumber: 25, playerId: "demo-casey", teamCode: "MEM", side: "under" },
  { pickNumber: 26, playerId: "demo-casey", teamCode: "UTA", side: "under" },
  { pickNumber: 27, playerId: "demo-riley", teamCode: "ATL", side: "over" },
  { pickNumber: 28, playerId: "demo-sam", teamCode: "POR", side: "under" },
  { pickNumber: 29, playerId: "demo-jordan", teamCode: "CLE", side: "under" },
  { pickNumber: 30, playerId: "demo-alex", teamCode: "NOP", side: "under" },
];

export const DEMO_DRAFT_PICKS = DEMO_PICK_INPUTS.map((p) => {
  const team = teamByCode.get(p.teamCode)!;
  return {
    id: `demo-pick-${p.pickNumber}`,
    session_id: DEMO_DRAFT_SESSION.id,
    user_id: p.playerId,
    team_id: team.id,
    side: p.side,
    round: Math.ceil(p.pickNumber / DEMO_PLAYERS.length),
    pick_number: p.pickNumber,
  };
});

export function demoDraftPickScores(userId?: string) {
  const records = demoTeamRecords();
  const recordByTeam = new Map(records.map((r) => [r.team_id, r]));

  return DEMO_DRAFT_PICKS.filter((pick) => !userId || pick.user_id === userId).map((pick) => {
    const record = recordByTeam.get(pick.team_id)!;
    const team = DEMO_TEAMS.find((t) => t.id === pick.team_id)!;
    const score = scorePick(record.wins, record.games_played, team.win_total_line, pick.side);
    return {
      pick_id: pick.id,
      session_id: pick.session_id,
      user_id: pick.user_id,
      team_id: pick.team_id,
      side: pick.side,
      round: pick.round,
      pick_number: pick.pick_number,
      wins: record.wins,
      losses: record.losses,
      games_played: record.games_played,
      win_total_line: team.win_total_line,
      resolved: score.resolved,
      correct: score.correct,
      bonus_points: score.bonusPoints,
      bonus_final: score.bonusFinal,
      points: score.points,
    };
  });
}

// Division winners aren't decided mid-season, so none are recorded yet
// and nobody has division points — same as the real app until April.
export const DEMO_DIVISION_WINNERS: Partial<Record<Division, string>> = {};

interface DemoDivisionPredictionInput {
  playerId: string;
  division: Division;
  teamCode: string;
}

const DEMO_DIVISION_PREDICTION_INPUTS: DemoDivisionPredictionInput[] = [
  { playerId: "demo-alex", division: "Atlantic", teamCode: "NYK" },
  { playerId: "demo-alex", division: "Central", teamCode: "DET" },
  { playerId: "demo-alex", division: "Southeast", teamCode: "ORL" },
  { playerId: "demo-alex", division: "Northwest", teamCode: "OKC" },
  { playerId: "demo-alex", division: "Pacific", teamCode: "LAL" },
  { playerId: "demo-alex", division: "Southwest", teamCode: "SAS" },

  { playerId: "demo-jordan", division: "Atlantic", teamCode: "BOS" },
  { playerId: "demo-jordan", division: "Central", teamCode: "CLE" },
  { playerId: "demo-jordan", division: "Southeast", teamCode: "MIA" },
  { playerId: "demo-jordan", division: "Northwest", teamCode: "DEN" },
  { playerId: "demo-jordan", division: "Pacific", teamCode: "GSW" },
  { playerId: "demo-jordan", division: "Southwest", teamCode: "HOU" },

  { playerId: "demo-sam", division: "Atlantic", teamCode: "BOS" },
  { playerId: "demo-sam", division: "Central", teamCode: "DET" },
  { playerId: "demo-sam", division: "Southeast", teamCode: "ATL" },
  { playerId: "demo-sam", division: "Northwest", teamCode: "OKC" },
  { playerId: "demo-sam", division: "Pacific", teamCode: "LAL" },
  { playerId: "demo-sam", division: "Southwest", teamCode: "SAS" },

  { playerId: "demo-riley", division: "Atlantic", teamCode: "PHI" },
  { playerId: "demo-riley", division: "Central", teamCode: "CLE" },
  { playerId: "demo-riley", division: "Southeast", teamCode: "ORL" },
  { playerId: "demo-riley", division: "Northwest", teamCode: "MIN" },
  { playerId: "demo-riley", division: "Pacific", teamCode: "PHX" },
  { playerId: "demo-riley", division: "Southwest", teamCode: "SAS" },

  { playerId: "demo-casey", division: "Atlantic", teamCode: "NYK" },
  { playerId: "demo-casey", division: "Central", teamCode: "DET" },
  { playerId: "demo-casey", division: "Southeast", teamCode: "MIA" },
  { playerId: "demo-casey", division: "Northwest", teamCode: "OKC" },
  { playerId: "demo-casey", division: "Pacific", teamCode: "LAL" },
  { playerId: "demo-casey", division: "Southwest", teamCode: "HOU" },
];

export const DEMO_DIVISION_PREDICTIONS = DEMO_DIVISION_PREDICTION_INPUTS.map((p) => ({
  user_id: p.playerId,
  division: p.division,
  predicted_team_id: teamByCode.get(p.teamCode)!.id,
}));

function demoDivisionPointsByUser() {
  const points = new Map<string, number>();
  for (const pred of DEMO_DIVISION_PREDICTIONS) {
    const actualCode = DEMO_DIVISION_WINNERS[pred.division as Division];
    if (!actualCode) continue;
    if (pred.predicted_team_id === teamByCode.get(actualCode)!.id) {
      points.set(pred.user_id, (points.get(pred.user_id) ?? 0) + POINTS_PER_DIVISION_PICK);
    }
  }
  return points;
}

export const DEMO_TIEBREAKER_PREDICTIONS: Record<string, number> = {
  "demo-alex": 280500,
  "demo-jordan": 284000,
  "demo-sam": 282250,
  "demo-riley": 279900,
  "demo-casey": 286100,
};

// 66 games x 30 teams / 2 = 990 games final, ~229 points a game.
export const DEMO_LEAGUE_TOTAL_POINTS = { total_points: 226710, games_final: 990 };

export function demoOverallLeaderboard() {
  const divisionPoints = demoDivisionPointsByUser();
  const draftPointsByUser = new Map<string, number>();
  for (const player of DEMO_PLAYERS) {
    const total = demoDraftPickScores(player.id).reduce((sum, p) => sum + p.points, 0);
    draftPointsByUser.set(player.id, total);
  }

  return DEMO_PLAYERS.map((player) => {
    const draft_points = draftPointsByUser.get(player.id) ?? 0;
    const division_points = divisionPoints.get(player.id) ?? 0;
    return {
      user_id: player.id,
      display_name: player.display_name,
      draft_points,
      division_points,
      total_points: draft_points + division_points,
    };
  }).sort((a, b) => b.total_points - a.total_points);
}
