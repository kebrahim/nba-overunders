"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteParticipantButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${name}? This removes their account and sign-in for good — they'd have to sign up again to rejoin.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/delete-participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-full border border-bad/40 px-3 py-1 text-xs font-medium text-bad hover:bg-bad hover:text-accent-ink disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="mt-1 max-w-40 text-xs text-bad">{error}</p>}
    </div>
  );
}
