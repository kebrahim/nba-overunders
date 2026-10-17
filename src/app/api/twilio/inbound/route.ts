import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Twilio's standard compliance keywords (case-insensitive). See
// https://www.twilio.com/docs/messaging/features/opt-out
const OPT_OUT_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const OPT_IN_KEYWORDS = new Set(["start", "yes", "unstop"]);

/**
 * Receives Twilio Conversations' onMessageAdded webhook events for the
 * group thread, so a STOP/START reply updates profiles.sms_opted_out_at
 * — otherwise Twilio handles opt-out at the carrier level (delivery is
 * blocked either way) but the app has no idea it happened.
 *
 * Configure this in the Twilio Console under Conversations > Services >
 * (your service) > Webhooks — Post-Event URL, event onMessageAdded —
 * pointing at this route with ?secret=<TWILIO_INBOUND_WEBHOOK_SECRET>.
 * A shared secret in the URL (checked below) stands in for full request-
 * signature validation: simpler to get right, and the worst case of a
 * spoofed request here is a wrongly-flagged opt-out, not a data leak.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const expectedSecret = process.env.TWILIO_INBOUND_WEBHOOK_SECRET;
  if (!expectedSecret || url.searchParams.get("secret") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const form = await request.formData();
  if (form.get("EventType") !== "onMessageAdded") {
    // Some other Conversations event (participant added, etc.) — no-op.
    return NextResponse.json({ ok: true });
  }

  const author = form.get("Author");
  const body = form.get("Body");
  if (typeof author !== "string" || typeof body !== "string") {
    return NextResponse.json({ ok: true });
  }

  const keyword = body.trim().toLowerCase();
  const db = createServiceRoleClient();

  if (OPT_OUT_KEYWORDS.has(keyword)) {
    await db.from("profiles").update({ sms_opted_out_at: new Date().toISOString() }).eq("phone", author);
  } else if (OPT_IN_KEYWORDS.has(keyword)) {
    await db.from("profiles").update({ sms_opted_out_at: null }).eq("phone", author);
  }

  return NextResponse.json({ ok: true });
}
