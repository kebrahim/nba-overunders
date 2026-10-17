"use client";

import { useActionState } from "react";
import { TeamLogo } from "@/components/team-logo";
import { saveWinTotalLines, type AdminFormState } from "./actions";

const initialState: AdminFormState = { error: null, success: false };

interface Team {
  id: number;
  name: string;
  code: string;
  win_total_line: number | null;
}

export function WinTotalForm({ teams }: { teams: Team[] }) {
  const [state, action, pending] = useActionState(saveWinTotalLines, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((team) => (
          <label key={team.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <TeamLogo code={team.code} name={team.name} size={20} />
              {team.name}
            </span>
            <input
              key={team.win_total_line ?? "empty"}
              type="number"
              step={0.5}
              name={`line:${team.id}`}
              defaultValue={team.win_total_line ?? ""}
              className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-right text-ink focus:border-accent focus:outline-none"
            />
          </label>
        ))}
      </div>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.success && <p className="text-sm text-good">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save win totals"}
      </button>
    </form>
  );
}
