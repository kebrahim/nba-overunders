import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { getSmsConversationSid, getSmsEnabled } from "@/lib/notify/sms";
import { getRecapTone } from "@/lib/notify/weekly-recap";
import { getLastSyncedAt } from "@/lib/domain/sync-status";
import type { Division } from "@/lib/supabase/types";
import { WinTotalForm } from "./win-total-form";
import { DivisionWinnersForm } from "./division-winners-form";
import { Participants } from "./participants";
import { StartDraftButton } from "../draft/start-draft-button";
import { DraftControls } from "./draft-controls";
import { SyncScoresButton } from "./sync-scores-button";
import { SmsSetup } from "./sms-setup";
import { RecapToneForm } from "./recap-tone-form";
import { SmsToggleForm } from "./sms-toggle-form";
import { AdminSection } from "./section";
import { TeamLogo } from "@/components/team-logo";

export const dynamic = "force-dynamic";

const MESSAGE_KIND_LABELS: Record<string, string> = {
  draft: "Draft update",
  draft_welcome_test: "Welcome text (test)",
  draft_pick_test: "Draft pick text (test)",
  weekly: "Weekly text",
  weekly_fallback: "Weekly text (fallback)",
  weekly_test: "Weekly text (test)",
  connectivity_test: "Connectivity test",
};

function formatMessageKind(kind: string): string {
  return MESSAGE_KIND_LABELS[kind] ?? kind;
}

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_commissioner) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <p className="text-ink-muted">Commissioner access only.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const [
    { data: teams },
    { data: divisionWinners },
    { data: session },
    { data: recentPicks },
    { data: participants },
    { data: divisionPredictions },
    { data: tiebreakers },
    { data: allDraftPicks },
    { data: sentMessages },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, code, conference, division, win_total_line")
      .order("name"),
    supabase.from("division_winners").select("division, team_id"),
    supabase
      .from("draft_sessions")
      .select("id, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("draft_picks")
      .select("id, pick_number, team_id, side, user_id")
      .order("pick_number", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("id, display_name, email, phone, sms_opted_out_at")
      .eq("is_demo", false)
      .order("display_name"),
    supabase.from("division_predictions").select("user_id, division, predicted_team_id"),
    supabase.from("tiebreaker_predictions").select("user_id, points_guess"),
    supabase.from("draft_picks").select("user_id, team_id, side, pick_number"),
    supabase
      .from("sent_messages")
      .select("id, kind, target, message, sent_at")
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);

  const smsConversationSid = await getSmsConversationSid();
  const recapTone = await getRecapTone();
  const [draftTextsEnabled, weeklyTextsEnabled] = await Promise.all([
    getSmsEnabled("draft"),
    getSmsEnabled("weekly"),
  ]);
  const lastSyncedAt = await getLastSyncedAt();
  const missingPhoneNames = (participants ?? [])
    .filter((p) => !p.phone)
    .map((p) => p.display_name);

  const existingWinners = new Map<Division, number>(
    (divisionWinners ?? []).map((w) => [w.division as Division, w.team_id]),
  );

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  const divisionPicksByUser = new Map<
    string,
    { division: string; teamName: string; teamCode: string }[]
  >();
  for (const p of divisionPredictions ?? []) {
    const list = divisionPicksByUser.get(p.user_id) ?? [];
    const team = teamById.get(p.predicted_team_id);
    list.push({ division: p.division, teamName: team?.name ?? "?", teamCode: team?.code ?? "" });
    divisionPicksByUser.set(p.user_id, list);
  }

  const tiebreakerByUser = new Map((tiebreakers ?? []).map((t) => [t.user_id, t.points_guess]));

  const draftPicksByUser = new Map<
    string,
    { pickNumber: number; teamName: string; teamCode: string; side: string }[]
  >();
  for (const dp of allDraftPicks ?? []) {
    const list = draftPicksByUser.get(dp.user_id) ?? [];
    const team = teamById.get(dp.team_id);
    list.push({
      pickNumber: dp.pick_number,
      teamName: team?.name ?? "?",
      teamCode: team?.code ?? "",
      side: dp.side,
    });
    draftPicksByUser.set(dp.user_id, list);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-12 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
          Admin
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Commissioner tools.</p>
      </div>

      <AdminSection
        title="Participants"
        description="Everyone's nickname, email, and picks at a glance."
      >
        <Participants
          participants={participants ?? []}
          divisionPicksByUser={divisionPicksByUser}
          tiebreakerByUser={tiebreakerByUser}
          draftPicksByUser={draftPicksByUser}
          currentUserId={profile.id}
        />
      </AdminSection>

      <AdminSection
        title="Scores"
        description="Syncs automatically once a day. Use this to pull the latest scores right now."
      >
        <p className="mb-3 text-sm text-ink-muted">
          Last synced:{" "}
          {lastSyncedAt
            ? `${new Date(lastSyncedAt).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "medium",
                timeStyle: "short",
              })} ET`
            : "never"}
        </p>
        <SyncScoresButton />
      </AdminSection>

      <AdminSection
        title="Group text"
        description="Sends draft updates and a Monday recap + preview to everyone as a group MMS thread. Set up once, then turn draft texts and the weekly text on or off separately."
      >
        <div className="mb-6 space-y-3">
          <SmsToggleForm
            channel="draft"
            label="Draft texts (start, each pick, who's on the clock)"
            enabled={draftTextsEnabled}
          />
          <SmsToggleForm
            channel="weekly"
            label="Weekly text (Monday recap + preview)"
            enabled={weeklyTextsEnabled}
          />
        </div>
        <SmsSetup configured={!!smsConversationSid} missingPhoneNames={missingPhoneNames} />
      </AdminSection>

      <AdminSection
        title="Text tone"
        description="Controls how Claude writes the weekly text (last week's recap plus the week-ahead preview) sent to the group thread."
      >
        <RecapToneForm current={recapTone} />
      </AdminSection>

      <AdminSection
        title="Message log"
        description="Last 20 texts sent — weekly texts and connectivity tests — since there's otherwise no record besides someone's actual phone."
      >
        {sentMessages && sentMessages.length > 0 ? (
          <ul className="space-y-3">
            {sentMessages.map((m) => (
              <li key={m.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  <span className="font-semibold tracking-wide text-ink uppercase">
                    {formatMessageKind(m.kind)}
                  </span>
                  <span>→ {m.target === "self" ? "me" : "group"}</span>
                  <span>·</span>
                  <span>
                    {new Date(m.sent_at).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    ET
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-ink">{m.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No texts sent yet.</p>
        )}
      </AdminSection>

      <AdminSection title="Draft" description={`Status: ${session?.status ?? "not started"}`}>
        <div className="space-y-3">
          {(!session || session.status === "completed") && <StartDraftButton />}
          {session && <DraftControls hasPicks={!!recentPicks && recentPicks.length > 0} />}
        </div>
        {recentPicks && recentPicks.length > 0 && (
          <ol className="mt-4 space-y-1 text-sm text-ink-muted">
            {recentPicks.map((p) => {
              const team = teamById.get(p.team_id);
              return (
                <li key={p.id} className="flex items-center gap-1.5">
                  {team && <TeamLogo code={team.code} name={team.name} size={16} />}
                  #{p.pick_number} — {team?.name ?? p.team_id}{" "}
                  <span className="capitalize">{p.side}</span>
                </li>
              );
            })}
          </ol>
        )}
      </AdminSection>

      <AdminSection
        title="Win-total lines"
        description="Set before the draft starts. Use half-point lines to avoid pushes."
      >
        <WinTotalForm teams={teams ?? []} />
      </AdminSection>

      <AdminSection
        title="Division winners"
        description="Record the actual winners once the regular season ends."
      >
        <DivisionWinnersForm teams={teams ?? []} existing={existingWinners} />
      </AdminSection>
    </main>
  );
}
