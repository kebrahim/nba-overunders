"use client";

import { useActionState } from "react";
import { changeEmail, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { error: null, success: false };

export function EmailForm({ existing, locked }: { existing: string; locked: boolean }) {
  const [state, action, pending] = useActionState(changeEmail, initialState);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          key={existing}
          id="email"
          name="email"
          type="email"
          required
          disabled={locked}
          defaultValue={existing}
          className="w-64 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>
      <p className="text-xs text-ink-muted">
        Changing this sends a confirmation link to the new address — it doesn&apos;t take effect
        (and this page won&apos;t show it) until you click it.
      </p>
      <button
        type="submit"
        disabled={pending || locked}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {locked ? "Locked" : pending ? "Sending…" : "Change email"}
      </button>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-good">
          Confirmation email sent — check your inbox to complete the change.
        </p>
      )}
    </form>
  );
}
