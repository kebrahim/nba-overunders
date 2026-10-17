"use client";

import { useActionState } from "react";
import { RECAP_TONES, type RecapTone } from "@/lib/notify/weekly-recap";
import { saveRecapTone, type AdminFormState } from "./actions";

const initialState: AdminFormState = { error: null, success: false };

export function RecapToneForm({ current }: { current: RecapTone }) {
  const [state, action, pending] = useActionState(saveRecapTone, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {RECAP_TONES.map((tone) => (
          <label
            key={tone.id}
            className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm has-checked:border-accent"
          >
            <input
              type="radio"
              name="tone"
              value={tone.id}
              defaultChecked={tone.id === current}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium">{tone.label}</span>
              <span className="block text-ink-muted">{tone.description}</span>
            </span>
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
        {pending ? "Saving…" : "Save tone"}
      </button>
    </form>
  );
}
