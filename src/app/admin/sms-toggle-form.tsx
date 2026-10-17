"use client";

import { useActionState } from "react";
import { saveSmsEnabled, type AdminFormState } from "./actions";

const initialState: AdminFormState = { error: null, success: false };

/**
 * Master switch for automatic group texts (draft alerts and the weekly
 * text). The test buttons below still work while it's off.
 */
export function SmsToggleForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(saveSmsEnabled, initialState);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <span className="text-sm">
        Automatic texts are{" "}
        <span className={`font-semibold ${enabled ? "text-good" : "text-bad"}`}>
          {enabled ? "on" : "off"}
        </span>
        .
      </span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : enabled ? "Turn off" : "Turn on"}
      </button>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
    </form>
  );
}
