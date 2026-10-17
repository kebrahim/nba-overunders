"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DraftControls({ hasPicks }: { hasPicks: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"undo" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, key: "undo" | "reset") {
    setPending(key);
    setError(null);
    const res = await fetch(path, { method: "POST" });
    const body = await res.json();
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  function undoLastPick() {
    if (!confirm("Undo the most recent draft pick?")) return;
    call("/api/draft/undo-last-pick", "undo");
  }

  function resetDraft() {
    if (!confirm("Reset the draft? This deletes every pick and the draft order — everyone will need to draft again from scratch.")) return;
    call("/api/draft/reset", "reset");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={undoLastPick}
          disabled={!hasPicks || pending !== null}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50"
        >
          {pending === "undo" ? "Undoing…" : "Undo last pick"}
        </button>
        <button
          type="button"
          onClick={resetDraft}
          disabled={pending !== null}
          className="rounded-full border border-bad/40 px-4 py-1.5 text-sm font-medium text-bad hover:bg-bad hover:text-accent-ink disabled:opacity-50"
        >
          {pending === "reset" ? "Resetting…" : "Reset draft"}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
