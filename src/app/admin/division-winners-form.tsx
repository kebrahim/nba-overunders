"use client";

import { useActionState } from "react";
import { DIVISIONS } from "@/lib/domain/divisions";
import { saveDivisionWinners, type AdminFormState } from "./actions";
import type { Division } from "@/lib/supabase/types";

const initialState: AdminFormState = { error: null, success: false };

interface Team {
  id: number;
  name: string;
  conference: string;
  division: string;
}

export function DivisionWinnersForm({
  teams,
  existing,
}: {
  teams: Team[];
  existing: Map<Division, number>;
}) {
  const [state, action, pending] = useActionState(saveDivisionWinners, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {DIVISIONS.map((division) => {
          const [conference, ...rest] = division.split(" ");
          const divisionName = rest.join(" ");
          const options = teams.filter(
            (t) => t.conference === conference && t.division === divisionName,
          );
          return (
            <label key={division} className="flex items-center justify-between gap-3 text-sm">
              {division}
              <select
                key={existing.get(division) ?? "empty"}
                name={`division:${division}`}
                defaultValue={existing.get(division) ?? ""}
                className="rounded-md border border-border bg-bg px-2 py-1 text-ink focus:border-accent focus:outline-none"
              >
                <option value="">— clear —</option>
                {options.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.success && <p className="text-sm text-good">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save division winners"}
      </button>
    </form>
  );
}
