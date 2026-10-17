"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncScoresButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setError(null);
    setResult(null);
    setDiagnostics(null);
    const res = await fetch("/api/sync/games", { method: "POST" });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setResult(`Synced ${body.synced} game${body.synced === 1 ? "" : "s"}.`);
    if (body.synced === 0) {
      setDiagnostics(body);
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync scores now"}
      </button>
      {result && <p className="text-sm text-good">{result}</p>}
      {diagnostics != null && (
        <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 text-xs text-ink-muted">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
