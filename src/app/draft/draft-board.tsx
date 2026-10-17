"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playerIndexForPick, userIdOnTheClock } from "@/lib/domain/draft";
import { TeamLogo } from "@/components/team-logo";
import type { Side } from "@/lib/supabase/types";

interface Team {
  id: number;
  name: string;
  code: string;
  conference: string;
  division: string;
  win_total_line: number | null;
}
interface Player {
  id: string;
  display_name: string;
}
interface Pick {
  id: string;
  user_id: string;
  team_id: number;
  side: Side;
  round: number;
  pick_number: number;
}
interface Session {
  id: string;
  status: string;
  snake_order: string[];
  current_pick_index: number;
  total_rounds: number;
  current_round: number;
}

export function DraftBoard({
  session,
  initialPicks,
  teams,
  players,
  currentUserId,
  isCommissioner = false,
}: {
  session: Session;
  initialPicks: Pick[];
  teams: Team[];
  players: Player[];
  currentUserId: string | null;
  isCommissioner?: boolean;
}) {
  const router = useRouter();
  const [conferenceFilter, setConferenceFilter] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSelection, setConfirmSelection] = useState<{
    teamId: number;
    teamName: string;
    side: Side;
    line: number | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`draft-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_picks", filter: `session_id=eq.${session.id}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_sessions", filter: `id=eq.${session.id}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, router]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const takenKeys = useMemo(
    () => new Set(initialPicks.map((p) => `${p.team_id}:${p.side}`)),
    [initialPicks],
  );
  const onTheClock = userIdOnTheClock(session.snake_order, session.current_pick_index);
  const onTheClockIndex =
    session.status === "active"
      ? playerIndexForPick(session.current_pick_index + 1, session.snake_order.length)
      : -1;
  const isMyTurn = session.status === "active" && onTheClock === currentUserId;
  const canPick = session.status === "active" && onTheClock != null && (isMyTurn || isCommissioner);
  const pickingForSomeoneElse = canPick && !isMyTurn && isCommissioner;
  const conferences = Array.from(new Set(teams.map((t) => t.conference)));
  const visibleTeams = conferenceFilter
    ? teams.filter((t) => t.conference === conferenceFilter)
    : teams;

  async function makePick(teamId: number, side: Side) {
    const key = `${teamId}:${side}`;
    setPendingKey(key);
    setError(null);
    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, teamId, side }),
    });
    const body = await res.json();
    setPendingKey(null);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function confirmPick() {
    if (!confirmSelection) return;
    const { teamId, side } = confirmSelection;
    setConfirmSelection(null);
    await makePick(teamId, side);
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-lg border border-border bg-surface p-4">
        {session.status === "completed" ? (
          <p className="font-heading font-semibold tracking-wide text-accent uppercase">
            Draft complete
          </p>
        ) : (
          <p className="font-medium">
            Round {session.current_round} of {session.total_rounds} — on the clock:{" "}
            <span className="text-accent">
              {onTheClock ? playerById.get(onTheClock)?.display_name ?? "…" : "—"}
            </span>
            {isMyTurn && <span className="ml-2 text-good">(you!)</span>}
            {pickingForSomeoneElse && (
              <span className="ml-2 text-xs text-ink-muted">
                (you&apos;re the commissioner — you can make this pick for them)
              </span>
            )}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-muted">
          {session.snake_order.map((playerId, i) => (
            <span key={i} className={i === onTheClockIndex ? "font-semibold text-accent" : ""}>
              {playerById.get(playerId)?.display_name ?? "?"}
              {i < session.snake_order.length - 1 ? " ·" : ""}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConferenceFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            conferenceFilter === null
              ? "bg-accent text-accent-ink"
              : "border border-border text-ink-muted hover:text-ink"
          }`}
        >
          All
        </button>
        {conferences.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setConferenceFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              conferenceFilter === c
                ? "bg-accent text-accent-ink"
                : "border border-border text-ink-muted hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleTeams.map((team) => {
          const overTaken = takenKeys.has(`${team.id}:over`);
          const underTaken = takenKeys.has(`${team.id}:under`);
          const line = team.win_total_line;
          return (
            <div key={team.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <TeamLogo code={team.code} name={team.name} size={28} />
                <div>
                  <p className="text-sm font-medium">{team.name}</p>
                  <p className="text-xs text-ink-muted">
                    {team.conference} {team.division}
                    {line != null ? ` · Line ${line}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <PickButton
                  label={line != null ? `Over ${line}` : "Over"}
                  variant="good"
                  taken={overTaken}
                  disabled={!canPick}
                  pending={pendingKey === `${team.id}:over`}
                  onClick={() =>
                    setConfirmSelection({ teamId: team.id, teamName: team.name, side: "over", line })
                  }
                />
                <PickButton
                  label={line != null ? `Under ${line}` : "Under"}
                  variant="bad"
                  taken={underTaken}
                  disabled={!canPick}
                  pending={pendingKey === `${team.id}:under`}
                  onClick={() =>
                    setConfirmSelection({ teamId: team.id, teamName: team.name, side: "under", line })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Picks so far
        </h2>
        <ol className="mt-2 space-y-1 text-sm">
          {[...initialPicks].reverse().map((pick) => {
            const team = teams.find((t) => t.id === pick.team_id);
            return (
              <li key={pick.id} className="flex items-center gap-1.5 text-ink-muted">
                {team && <TeamLogo code={team.code} name={team.name} size={16} />}
                #{pick.pick_number} — {playerById.get(pick.user_id)?.display_name} took{" "}
                <span className="text-ink">
                  {team?.name} {pick.side}
                  {team?.win_total_line != null ? ` ${team.win_total_line}` : ""}
                </span>
              </li>
            );
          })}
          {initialPicks.length === 0 && <li className="text-ink-muted">No picks yet.</li>}
        </ol>
      </div>

      {confirmSelection && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-ink-muted">
              {pickingForSomeoneElse && onTheClock
                ? `Confirm pick for ${playerById.get(onTheClock)?.display_name ?? "player"}`
                : "Confirm your pick"}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {confirmSelection.teamName}{" "}
              <span className="capitalize text-accent">
                {confirmSelection.side}
                {confirmSelection.line != null ? ` ${confirmSelection.line}` : ""}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">This can&apos;t be undone by you once submitted.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmSelection(null)}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPick}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PickButton({
  label,
  variant,
  taken,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  variant: "good" | "bad";
  taken: boolean;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const activeClasses =
    variant === "good"
      ? "border-good/40 text-good hover:border-good hover:bg-good hover:text-accent-ink"
      : "border-bad/40 text-bad hover:border-bad hover:bg-bad hover:text-accent-ink";

  return (
    <button
      type="button"
      disabled={taken || disabled || pending}
      onClick={onClick}
      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
        taken
          ? "cursor-not-allowed border-border bg-surface-2 text-ink-muted"
          : disabled
            ? "cursor-not-allowed border-border text-ink-muted"
            : activeClasses
      }`}
    >
      {pending ? "…" : taken ? `${label} (taken)` : label}
    </button>
  );
}
