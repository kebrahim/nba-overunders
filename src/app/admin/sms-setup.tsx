"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const sectionLabelClass = "text-xs font-medium tracking-wide text-ink-muted uppercase";
const pillButtonClass =
  "rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50";
const cellButtonClass =
  "rounded-full border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-surface-2 disabled:opacity-50";

export function SmsSetup({
  configured,
  missingPhoneNames,
}: {
  configured: boolean;
  missingPhoneNames: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [twilioError, setTwilioError] = useState<unknown>(null);

  async function setUp(recreate: boolean) {
    setPending(true);
    setError(null);
    setResult(null);
    setTwilioError(null);
    const res = await fetch("/api/admin/sms/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recreate }),
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      if (body.twilioError) setTwilioError(body.twilioError);
      return;
    }
    setResult(
      body.alreadyExists
        ? "Group text is already set up."
        : "Group text thread created! Ask everyone to save the Twilio number as a contact.",
    );
    router.refresh();
  }

  async function sendConnectivityTest(target: "self" | "group") {
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch(target === "self" ? "/api/admin/sms/test" : "/api/admin/sms/test-group", {
      method: "POST",
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setResult(
      target === "self"
        ? "Test text sent to your own number — check your phone."
        : "Test message sent to the group thread — check everyone's phone.",
    );
  }

  async function sendGenerated(target: "self" | "group") {
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/sms/test-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const destination = target === "self" ? "your phone" : "the group thread";
    setResult(`Sent to ${destination}:\n"${body.message}"`);
  }

  const messageTestRows: { key: string; label: string; onSend: (target: "self" | "group") => void }[] = [
    { key: "connectivity", label: "Connectivity test", onSend: sendConnectivityTest },
    { key: "weekly", label: "Weekly text", onSend: sendGenerated },
  ];

  return (
    <div className="space-y-6">
      {missingPhoneNames.length > 0 && (
        <p className="text-sm text-bad">
          Missing phone numbers for: {missingPhoneNames.join(", ")}. They need to add theirs on
          My Picks first.
        </p>
      )}

      <div className="space-y-2">
        <p className={sectionLabelClass}>Setup</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUp(false)}
            disabled={pending || missingPhoneNames.length > 0}
            className={pillButtonClass}
          >
            {pending ? "Working…" : configured ? "Group text already set up" : "Create SMS group text"}
          </button>
          {configured && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("This creates a brand-new group thread. Continue?")) setUp(true);
              }}
              disabled={pending || missingPhoneNames.length > 0}
              className={pillButtonClass}
            >
              Recreate
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className={sectionLabelClass}>Message tests</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="w-1/3 px-3 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                  Message
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                  To me
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                  To group
                </th>
              </tr>
            </thead>
            <tbody>
              {messageTestRows.map((row, i) => (
                <tr key={row.key} className={i > 0 ? "border-t border-border" : undefined}>
                  <td className="px-3 py-2.5 font-medium text-ink">{row.label}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => row.onSend("self")}
                      disabled={pending}
                      className={cellButtonClass}
                    >
                      Send
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {configured ? (
                      <button
                        type="button"
                        onClick={() => row.onSend("group")}
                        disabled={pending}
                        className={cellButtonClass}
                      >
                        Send
                      </button>
                    ) : (
                      <span className="text-xs text-ink-muted">Set up group text first</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm whitespace-pre-line text-good">
          {result}
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {twilioError != null && (
        <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 text-xs text-ink-muted">
          {JSON.stringify(twilioError, null, 2)}
        </pre>
      )}
    </div>
  );
}
