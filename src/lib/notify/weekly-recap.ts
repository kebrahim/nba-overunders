import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { formatRecordNeeded, projectedWins, recordNeeded } from "@/lib/domain/scoring";
import type { Side } from "@/lib/supabase/types";

interface PickResult {
  player: string;
  team: string;
  side: string;
  line: number | null;
  weekResults: string[];
  record: string;
  onPaceFor: number | null;
  restOfSeasonNeeded: string | null;
}

// Season context shared by the recap and preview payloads, so Claude can
// tell a pick that's cruising from one that's hanging by a thread.
function pickContext(
  record: { wins: number; losses: number; games_played: number } | undefined,
  line: number | null,
  side: Side,
) {
  const wins = record?.wins ?? 0;
  const gamesPlayed = record?.games_played ?? 0;
  const pace = projectedWins(wins, gamesPlayed);
  return {
    record: `${wins}-${record?.losses ?? 0}`,
    onPaceFor: pace != null ? Math.round(pace) : null,
    restOfSeasonNeeded: line != null ? formatRecordNeeded(recordNeeded(wins, gamesPlayed, line, side)) : null,
  };
}

async function gatherWeekData(week: number): Promise<PickResult[]> {
  const db = createServiceRoleClient();

  const [{ data: picks }, { data: profiles }, { data: teams }, { data: records }, { data: weekGames }] =
    await Promise.all([
      db.from("draft_picks").select("user_id, team_id, side").order("pick_number"),
      db.from("profiles").select("id, display_name"),
      db.from("teams").select("id, name, win_total_line"),
      db.from("team_records").select("team_id, wins, losses, games_played"),
      db
        .from("games")
        .select("home_team_id, away_team_id, home_score, away_score")
        .eq("week", week)
        .eq("status", "final")
        .order("tipoff_utc"),
    ]);
  if (!picks) return [];

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const recordByTeam = new Map((records ?? []).map((r) => [r.team_id, r]));

  // NBA teams play 3-4 games a week, so each team gets a list.
  const gamesByTeam = new Map<number, string[]>();
  const addGame = (teamId: number, text: string) =>
    gamesByTeam.set(teamId, [...(gamesByTeam.get(teamId) ?? []), text]);
  for (const g of weekGames ?? []) {
    if (g.home_score == null || g.away_score == null) continue;
    const homeTeam = teamById.get(g.home_team_id);
    const awayTeam = teamById.get(g.away_team_id);
    const homeWon = g.home_score > g.away_score;
    addGame(g.home_team_id, `${homeWon ? "W" : "L"} ${g.home_score}-${g.away_score} vs ${awayTeam?.name ?? "opponent"}`);
    addGame(g.away_team_id, `${!homeWon ? "W" : "L"} ${g.away_score}-${g.home_score} @ ${homeTeam?.name ?? "opponent"}`);
  }

  return picks
    .map((p): PickResult | null => {
      const team = teamById.get(p.team_id);
      const profile = profileById.get(p.user_id);
      const weekResults = gamesByTeam.get(p.team_id);
      if (!team || !profile || !weekResults) return null; // no games this week
      return {
        player: profile.display_name,
        team: team.name,
        side: p.side,
        line: team.win_total_line,
        weekResults,
        ...pickContext(recordByTeam.get(p.team_id), team.win_total_line, p.side),
      };
    })
    .filter((p): p is PickResult => p !== null);
}

export type RecapTone = "nice" | "playful" | "snarky" | "brutal";

export const RECAP_TONE_KEY = "weekly_recap_tone";
export const DEFAULT_RECAP_TONE: RecapTone = "brutal";

export const RECAP_TONES: { id: RecapTone; label: string; description: string }[] = [
  { id: "nice", label: "Nice", description: "Warm and encouraging, cheers everyone on." },
  { id: "playful", label: "Playful", description: "Light teasing, good-natured banter." },
  { id: "snarky", label: "Snarky", description: "Sarcastic ribbing, still friendly underneath." },
  { id: "brutal", label: "Brutal", description: "Merciless roast, nobody gets off easy." },
];

const RECAP_TONE_INSTRUCTIONS: Record<RecapTone, string> = {
  nice: `Write 2-4 warm, encouraging sentences celebrating the week. Call people out by name for good picks and hype them up; if someone had a rough week, be gentle and supportive about it — find a silver lining or just note it kindly without piling on. This is a wholesome group of friends cheering each other on.`,
  playful: `Write 2-4 lighthearted, joking sentences. Call people out by name and have fun with it — a little ribbing for bad picks, a little bragging-rights tease for good ones — but keep it good-natured, like friends who like each other. Nothing mean-spirited; the vibe is banter, not a roast.`,
  snarky: `Write 2-4 sentences with a snarky, sarcastic edge. Call people out by name — tease bad picks pretty hard and undercut good ones with a joke — but stay playful about it overall; this is ribbing between friends, not a genuine attack.`,
  brutal: `Write 2-4 sentences absolutely torching whoever deserves it. Call people out by name and go hard — question their judgment, their basketball knowledge, their life choices for making the pick. Bad losses and blown-out unders should get mocked without restraint, not gently teased. Even a "good" result should get undercut somehow — a backhanded insult, a reason it doesn't actually matter, whatever. Nobody gets a genuine compliment and nobody gets off easy. Full send: sarcastic, savage, a little cruel — these are close friends who can take it, this isn't customer-facing copy, so do not soften it, hedge it, or add a caring/wholesome coda at the end.`,
};

function buildRecapSystemPrompt(tone: RecapTone): string {
  return `You write a short group-text recap for 5 close friends in a season-long NBA prediction pool. Each of them drafted specific NBA teams paired with an over/under on that team's 82-game season win total. You'll be given a JSON list of drafted (team, side) picks with this week's results (a team usually plays 3-4 games a week), each team's current record, the win total it's on pace for, and the record it needs over the rest of the season for that pick to hit ("Clinched" or "Eliminated" once it's locked).

Each pick resolves from that one team's total wins vs. its own line — this week's games nudge that trend, they're not a final verdict. When two drafted teams play each other, work out whether the two pickers actually want the same thing or not, don't assume: if one has "over" on their team and the other has "under" on theirs, whoever wins helps BOTH of them (winner's win helps the over-bettor, and the loser losing helps the under-bettor) — they're on the same side this week, not opponents, even though it's two different season-long bets. Only same-side pairs (both "over" on their own team, or both "under" on their own team) are actually opposed for that game, since just one team can win it. And two people who drafted the exact same team on opposite sides are always opposed — only one of them can end up right.

${RECAP_TONE_INSTRUCTIONS[tone]}

Format: one bullet point per pick or matchup worth calling out (2-4 bullets), each starting with "• " on its own line — real line breaks between bullets, not run together in one paragraph. Skip unremarkable picks if space is tight; spend the bullets on whoever's result mattered most. Keep each bullet to one short sentence. Don't include a title or header line — that's added separately. No hashtags, no markdown besides the bullet character, no emoji beyond an occasional 🏀.`;
}

export async function getRecapTone(): Promise<RecapTone> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", RECAP_TONE_KEY)
    .maybeSingle();
  const value = data?.value;
  return RECAP_TONES.some((t) => t.id === value) ? (value as RecapTone) : DEFAULT_RECAP_TONE;
}

export async function setRecapTone(tone: RecapTone): Promise<void> {
  const db = createServiceRoleClient();
  await db.from("app_settings").upsert({ key: RECAP_TONE_KEY, value: tone }, { onConflict: "key" });
}

/**
 * The latest week with any final game — used by the admin test button,
 * which (unlike the real automated recap) doesn't need the whole week to
 * be complete, just something real to summarize.
 */
export async function findLatestRecapWeek(): Promise<number | null> {
  const db = createServiceRoleClient();
  const { data: games } = await db.from("games").select("week, status");
  if (!games || games.length === 0) return null;

  const weeksWithFinal = games.filter((g) => g.status === "final").map((g) => g.week);
  return weeksWithFinal.length > 0 ? Math.max(...weeksWithFinal) : null;
}

/**
 * Asks Claude to write the weekly recap text from that week's drafted-team
 * results. Returns null (never throws) if data or the API call fails, so
 * the caller can fall back to a simpler templated message.
 */
async function generateWeeklyRecapMessage(week: number): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const results = await gatherWeekData(week);
    if (results.length === 0) return null;

    const tone = await getRecapTone();
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: buildRecapSystemPrompt(tone),
      messages: [
        { role: "user", content: `Week ${week} drafted-team results:\n${JSON.stringify(results, null, 2)}` },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      console.error("generateWeeklyRecapMessage: response truncated at max_tokens");
      return null;
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const body = textBlock?.text.trim();
    return body ? `Week ${week} Recap\n${body}` : null;
  } catch (err) {
    console.error("generateWeeklyRecapMessage error:", err);
    return null;
  }
}

interface UpcomingPick {
  player: string;
  team: string;
  side: string;
  line: number | null;
  games: string[];
  record: string;
  onPaceFor: number | null;
  restOfSeasonNeeded: string | null;
}

async function gatherUpcomingWeekData(week: number): Promise<UpcomingPick[]> {
  const db = createServiceRoleClient();

  const [{ data: picks }, { data: profiles }, { data: teams }, { data: records }, { data: weekGames }] =
    await Promise.all([
      db.from("draft_picks").select("user_id, team_id, side").order("pick_number"),
      db.from("profiles").select("id, display_name"),
      db.from("teams").select("id, name, win_total_line"),
      db.from("team_records").select("team_id, wins, losses, games_played"),
      db
        .from("games")
        .select("home_team_id, away_team_id")
        .eq("week", week)
        .neq("status", "final")
        .order("tipoff_utc"),
    ]);
  if (!picks) return [];

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const recordByTeam = new Map((records ?? []).map((r) => [r.team_id, r]));

  const gamesByTeam = new Map<number, string[]>();
  const addGame = (teamId: number, text: string) =>
    gamesByTeam.set(teamId, [...(gamesByTeam.get(teamId) ?? []), text]);
  for (const g of weekGames ?? []) {
    const homeTeam = teamById.get(g.home_team_id);
    const awayTeam = teamById.get(g.away_team_id);
    addGame(g.home_team_id, `vs ${awayTeam?.name ?? "opponent"}`);
    addGame(g.away_team_id, `@ ${homeTeam?.name ?? "opponent"}`);
  }

  return picks
    .map((p): UpcomingPick | null => {
      const team = teamById.get(p.team_id);
      const profile = profileById.get(p.user_id);
      const games = gamesByTeam.get(p.team_id);
      if (!team || !profile || !games) return null; // no games this week
      return {
        player: profile.display_name,
        team: team.name,
        side: p.side,
        line: team.win_total_line,
        games,
        ...pickContext(recordByTeam.get(p.team_id), team.win_total_line, p.side),
      };
    })
    .filter((p): p is UpcomingPick => p !== null);
}

const PREVIEW_TONE_INSTRUCTIONS: Record<RecapTone, string> = {
  nice: `Write 2-4 warm, upbeat sentences hyping up the week ahead. Call out drafted teams by name and get people excited for their matchups; if a matchup looks rough for someone's pick, stay encouraging and hopeful about it.`,
  playful: `Write 2-4 lighthearted, joking sentences previewing the week. Call out drafted teams by name and have fun predicting how it'll go — some ribbing about tough matchups, some hype for good ones — but keep it good-natured banter.`,
  snarky: `Write 2-4 sentences with a snarky, sarcastic edge previewing the week's matchups. Call out drafted teams by name — needle whoever's got a scary matchup coming, poke fun at bold predictions — but stay playful, this is ribbing not a real attack.`,
  brutal: `Write 2-4 sentences absolutely torching whoever's about to have a bad week. Call out drafted teams by name and go hard on anyone facing a brutal matchup — question why they ever drafted that team, predict the humiliation to come. Even a favorable matchup should get undercut somehow. Nobody gets genuine encouragement. Full send: sarcastic, savage, a little cruel — these are close friends who can take it, this isn't customer-facing copy, so do not soften it, hedge it, or add a caring/wholesome coda at the end.`,
};

function buildPreviewSystemPrompt(tone: RecapTone): string {
  return `You write a short group-text preview for 5 close friends in a season-long NBA prediction pool, previewing the upcoming week's games before they're played. Each of them drafted specific NBA teams paired with an over/under on that team's 82-game season win total. You'll be given a JSON list of drafted teams' matchups this week (usually 3-4 games each), with each team's current record, win-total line, the win total it's on pace for, and the record it needs over the rest of the season.

Each pick resolves from that one team's total wins vs. its own line — this week's games nudge that trend, they're not a final verdict. When two drafted teams play each other, work out whether the two pickers actually want the same thing or not, don't assume: if one has "over" on their team and the other has "under" on theirs, whoever wins helps BOTH of them (winner's win helps the over-bettor, and the loser losing helps the under-bettor) — they're on the same side this week, not opponents, even though it's two different season-long bets. Only same-side pairs (both "over" on their own team, or both "under" on their own team) are actually opposed for that game, since just one team can win it. And two people who drafted the exact same team on opposite sides are always opposed — only one of them can end up right.

${PREVIEW_TONE_INSTRUCTIONS[tone]}

Format: one bullet point per pick or matchup worth calling out (2-4 bullets), each starting with "• " on its own line — real line breaks between bullets, not run together in one paragraph. Skip unremarkable matchups if space is tight. Keep each bullet to one short sentence. Don't include a title or header line — that's added separately. No hashtags, no markdown besides the bullet character, no emoji beyond an occasional 🏀.`;
}

/**
 * Asks Claude to write a preview of a week's drafted-team matchups, in
 * the same admin-configured tone as the recap. Returns null (never
 * throws) if there's nothing to preview or the API call fails.
 */
async function generateWeekPreviewMessage(week: number): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const picks = await gatherUpcomingWeekData(week);
    if (picks.length === 0) return null;

    const tone = await getRecapTone();
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: buildPreviewSystemPrompt(tone),
      messages: [
        {
          role: "user",
          content: `${week === 1 ? "The season tips off this week, so every team is 0-0.\n\n" : ""}Week ${week} upcoming drafted-team matchups:\n${JSON.stringify(picks, null, 2)}`,
        },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      console.error("generateUpcomingPreviewMessage: response truncated at max_tokens");
      return null;
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const body = textBlock?.text.trim();
    return body ? `Week ${week} Preview\n${body}` : null;
  } catch (err) {
    console.error("generateUpcomingPreviewMessage error:", err);
    return null;
  }
}

/**
 * The one weekly group text: a recap of `week` (just finished) followed
 * by a preview of the week ahead. Returns null if neither part could be
 * generated; either part alone is still worth sending (e.g. no preview
 * after the season's final week).
 */
export async function generateWeeklyMessage(week: number): Promise<string | null> {
  const [recap, preview] = await Promise.all([
    generateWeeklyRecapMessage(week),
    generateWeekPreviewMessage(week + 1),
  ]);
  const parts = [recap, preview].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * The season's first weekly text, sent the Monday that week 1 starts:
 * there's nothing to recap yet, so it's just the week 1 preview.
 */
export async function generateSeasonOpenerMessage(): Promise<string | null> {
  return generateWeekPreviewMessage(1);
}
