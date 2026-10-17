"use client";

import { useActionState } from "react";
import { saveTiebreaker, type PredictionFormState } from "./actions";

const initialState: PredictionFormState = { error: null, success: false };

export function TiebreakerForm({ existing, locked }: { existing: number | null; locked: boolean }) {
  const [state, action, pending] = useActionState(saveTiebreaker, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label htmlFor="points_guess" className="text-sm font-medium">
          Total points scored, all regular-season games
        </label>
        <input
          key={existing ?? "empty"}
          id="points_guess"
          name="points_guess"
          type="number"
          min={1}
          step={1}
          disabled={locked}
          defaultValue={existing ?? undefined}
          className="w-40 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={pending || locked}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {locked ? "Locked" : pending ? "Saving…" : "Save guess"}
      </button>
      {state.error && <p className="w-full text-sm text-bad">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-good">Saved.</p>}
    </form>
  );
}
