import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { demoOverallLeaderboard } from "@/lib/demo/data";
import { OPENING_TIP_AT } from "@/lib/domain/season";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/app";

export const dynamic = "force-dynamic";

interface SeasonBanner {
  headline: string;
  detail?: string;
}

async function getSeasonBanner(): Promise<SeasonBanner | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (profile.is_demo) {
    const leader = [...demoOverallLeaderboard()].sort((a, b) => b.total_points - a.total_points)[0];
    return leader
      ? {
          headline: `${leader.display_name} leads with ${leader.total_points} points`,
          detail: "Demo data (a season in progress) — sign in with a real account to see your own league's standings.",
        }
      : null;
  }

  const supabase = await createClient();
  const [{ data: session }, { data: games }, { data: leaderboard }] = await Promise.all([
    supabase
      .from("draft_sessions")
      .select("status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("games").select("week, status"),
    supabase
      .from("overall_leaderboard")
      .select("display_name, total_points")
      .order("total_points", { ascending: false })
      .limit(1),
  ]);

  if (session?.status === "active") {
    return { headline: "The draft is live", detail: "Head to the draft to see the current pick." };
  }
  if (session?.status !== "completed") {
    return null;
  }

  const leader = leaderboard?.[0];
  if (!games || games.length === 0) {
    return {
      headline: "Draft's complete — tip-off is almost here",
      detail: `Opening tip: ${new Date(OPENING_TIP_AT).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      })} ET`,
    };
  }

  const nonFinalWeeks = games.filter((g) => g.status !== "final").map((g) => g.week);
  if (nonFinalWeeks.length === 0) {
    return leader
      ? { headline: `🏆 Season complete! ${leader.display_name} wins with ${leader.total_points} points` }
      : null;
  }

  const currentWeek = Math.min(...nonFinalWeeks);
  return {
    headline: `Week ${currentWeek} is underway`,
    detail: leader ? `${leader.display_name} leads with ${leader.total_points} points` : undefined,
  };
}

const STEPS = [
  {
    title: "Draft",
    body: "5 players, 6 rounds, snake order. Each pick is a team + Over or Under on its season win total.",
  },
  {
    title: "Score",
    body: "1 point per correct pick, plus 0.25 points per win of margin beyond the line (capped at +3). Picks lock in as soon as they're mathematically clinched.",
  },
  {
    title: "Bonus picks",
    body: "Predict all 6 division winners (1 point each) before opening tip — separate from the draft.",
  },
  {
    title: "Tiebreaker",
    body: "Guess the total points scored across all 1,230 regular-season games, in case the standings are tied.",
  },
];

export default async function Home() {
  const seasonBanner = await getSeasonBanner();

  return (
    <main className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-3xl flex-1 flex-col items-center gap-12 px-6 py-24 text-center">
        <div className="space-y-4">
          <h1 className="font-heading text-6xl font-semibold tracking-wide text-ink uppercase drop-shadow-sm">
            {APP_NAME}
          </h1>
          <p className="font-heading text-2xl tracking-wide text-accent uppercase">{APP_TAGLINE}</p>
          <p className="mx-auto max-w-md text-lg leading-8 text-ink-muted">
            A season-long contest for 5 friends: draft NBA win-total
            over/unders, then see who calls it best.
          </p>
        </div>

        {seasonBanner && (
          <div className="w-full rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-left">
            <p className="font-heading font-semibold tracking-wide text-accent uppercase">
              {seasonBanner.headline}
            </p>
            {seasonBanner.detail && (
              <p className="mt-1 text-sm text-ink-muted">{seasonBanner.detail}</p>
            )}
          </div>
        )}

        <div className="grid w-full gap-4 text-left sm:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <h2 className="font-heading font-semibold tracking-wide text-accent uppercase">
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/draft"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Go to the draft
          </Link>
          <Link
            href="/leaderboard"
            className="flex h-12 items-center justify-center rounded-full border border-border px-6 text-ink transition-colors hover:bg-surface-2"
          >
            View leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
