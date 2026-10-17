"use client";

import { APP_NAME, SITE_HOST } from "@/lib/config/app";
import { useActionState } from "react";
import { savePhone, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { error: null, success: false };

export function PhoneForm({ existing, locked }: { existing: string | null; locked: boolean }) {
  const [state, action, pending] = useActionState(savePhone, initialState);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone number (optional)
        </label>
        <input
          key={existing ?? "empty"}
          id="phone"
          name="phone"
          type="tel"
          placeholder="(555) 123-4567"
          disabled={locked}
          defaultValue={existing ?? undefined}
          className="w-48 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          key={existing ?? "empty"}
          type="checkbox"
          name="consent"
          defaultChecked={!!existing}
          disabled={locked}
          className="mt-0.5"
        />
        <span>
          Yes, send me SMS/MMS text updates from {APP_NAME}
          {SITE_HOST ? ` (${SITE_HOST})` : ""} — draft turn alerts, pick updates, and a weekly
          recap. Message frequency varies. Message and
          data rates may apply. Reply STOP to opt out at any time, or HELP for help.
        </span>
      </label>
      <p className="text-xs text-ink-muted">
        This is entirely optional — leaving it unchecked doesn&apos;t affect your participation in
        the contest.
      </p>

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
