"use client";

import { useActionState } from "react";
import { saveDivisionPredictions, type PredictionFormState } from "./actions";
import { DIVISIONS } from "@/lib/domain/divisions";
import type { Division } from "@/lib/supabase/types";

const initialState: PredictionFormState = { error: null, success: false };

interface Team {
  id: number;
  name: string;
  conference: string;
  division: string;
}

export function DivisionForm({
  teams,
  existing,
  locked,
}: {
  teams: Team[];
  existing: Map<Division, number>;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(saveDivisionPredictions, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {DIVISIONS.map((division) => {
          const [conference, ...rest] = division.split(" ");
          const divisionName = rest.join(" ");
          const options = teams.filter(
            (t) => t.conference === conference && t.division === divisionName,
          );

          return (
            <div key={division} className="space-y-1">
              <label className="text-sm font-medium">{division}</label>
              <select
                key={existing.get(division) ?? "empty"}
                name={`division:${division}`}
                defaultValue={existing.get(division) ?? ""}
                disabled={locked}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
              >
                <option value="">— pick a team —</option>
                {options.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.success && <p className="text-sm text-good">Saved.</p>}

      <button
        type="submit"
        disabled={pending || locked}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {locked ? "Locked" : pending ? "Saving…" : "Save division picks"}
      </button>
    </form>
  );
}
