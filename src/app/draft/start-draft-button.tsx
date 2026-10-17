"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartDraftButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/draft/start", { method: "POST" });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start the draft"}
      </button>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
