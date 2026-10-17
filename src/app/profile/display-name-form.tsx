"use client";

import { useActionState } from "react";
import { saveDisplayName, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { error: null, success: false };

export function DisplayNameForm({ existing, locked }: { existing: string; locked: boolean }) {
  const [state, action, pending] = useActionState(saveDisplayName, initialState);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="display_name" className="block text-sm font-medium">
          Display name
        </label>
        <input
          key={existing}
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={40}
          disabled={locked}
          defaultValue={existing}
          className="w-64 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={pending || locked}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {locked ? "Locked" : pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.success && <p className="text-sm text-good">Saved.</p>}
    </form>
  );
}
