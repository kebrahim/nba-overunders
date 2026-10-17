import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { APP_NAME, APP_TAGLINE, SITE_HOST } from "@/lib/config/app";

const CONVERSATION_SID_KEY = "sms_conversation_sid";
const MESSAGE_PREFIX = `🏀 ${APP_NAME}:`;

/** The kinds of automatic group text, each with its own on/off switch. */
export type SmsChannel = "draft" | "weekly";

const SMS_ENABLED_KEYS: Record<SmsChannel, string> = {
  draft: "sms_draft_enabled",
  weekly: "sms_weekly_enabled",
};

/**
 * Whether one kind of automatic group text (draft alerts or the weekly
 * text) goes out. Each is off until the commissioner turns it on from
 * /admin; admin test buttons send regardless.
 */
export async function getSmsEnabled(channel: SmsChannel): Promise<boolean> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", SMS_ENABLED_KEYS[channel])
    .maybeSingle();
  return data?.value === "true";
}

export async function setSmsEnabled(channel: SmsChannel, enabled: boolean): Promise<void> {
  const db = createServiceRoleClient();
  await db
    .from("app_settings")
    .upsert({ key: SMS_ENABLED_KEYS[channel], value: String(enabled) }, { onConflict: "key" });
}

export async function getSmsConversationSid(): Promise<string | null> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", CONVERSATION_SID_KEY)
    .maybeSingle();
  return data?.value ?? null;
}

export async function setSmsConversationSid(sid: string): Promise<void> {
  const db = createServiceRoleClient();
  await db.from("app_settings").upsert({ key: CONVERSATION_SID_KEY, value: sid }, { onConflict: "key" });
}

function twilioAuthHeader(): string | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Records a sent text in the audit trail (sent_messages), so /admin can
 * show a history of what's gone out instead of relying on someone's
 * actual phone. Best-effort — a logging failure should never surface as
 * a send failure to the caller.
 */
async function logSentMessage(kind: string, target: "self" | "group", message: string): Promise<void> {
  try {
    const db = createServiceRoleClient();
    await db.from("sent_messages").insert({ kind, target, message });
  } catch (err) {
    console.error("logSentMessage error:", err);
  }
}

/**
 * Posts a message into the group MMS thread, if one's been set up and
 * that `channel`'s texts are turned on (`force` skips that check, for
 * admin tests).
 * Never throws — a notification failure should never break the draft
 * pick or score sync it's attached to — but callers that do care (e.g.
 * an admin test button) can inspect the returned result. `kind` is a
 * short label (e.g. "weekly", "connectivity_test") recorded in the
 * sent-messages audit trail.
 */
export async function sendGroupText(
  message: string,
  kind: string = "group",
  { channel, force = false }: { channel?: SmsChannel; force?: boolean } = {},
): Promise<SendResult> {
  if (!force && !(channel && (await getSmsEnabled(channel)))) {
    return { ok: false, error: "Texting is turned off." };
  }

  const auth = twilioAuthHeader();
  if (!auth) return { ok: false, error: "Twilio isn't configured." };

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) return { ok: false, error: "TWILIO_PHONE_NUMBER isn't set." };

  const conversationSid = await getSmsConversationSid();
  if (!conversationSid) return { ok: false, error: "No group text thread has been created yet." };

  try {
    const res = await fetch(
      `https://conversations.twilio.com/v1/Conversations/${conversationSid}/Messages`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
        // Author must match the "unattached" ProjectedAddress participant
        // added during setup — otherwise Twilio rejects the message with
        // 50513 ("Message author should be among Group MMS participants").
        body: new URLSearchParams({
          Author: fromNumber,
          Body: `${MESSAGE_PREFIX} ${message}\n\nReply STOP to opt out.`,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("Twilio sendGroupText failed:", res.status, text);
      return { ok: false, error: text };
    }
    await logSentMessage(kind, "group", message);
    return { ok: true };
  } catch (err) {
    console.error("Twilio sendGroupText error:", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Posts a 1:1 message to a single phone number via the plain Messages
 * API (not the group Conversation) — e.g. sending a generated recap/
 * preview to just the admin's own number to preview it before it goes
 * to everyone. Never throws; same SendResult contract as sendGroupText.
 * `kind` is recorded in the sent-messages audit trail, same as above.
 */
export async function sendDirectText(to: string, message: string, kind: string = "direct"): Promise<SendResult> {
  const auth = twilioAuthHeader();
  if (!auth) return { ok: false, error: "Twilio isn't configured." };

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) return { ok: false, error: "TWILIO_PHONE_NUMBER isn't set." };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: `${MESSAGE_PREFIX} ${message}\n\nReply STOP to opt out.`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Twilio sendDirectText failed:", res.status, text);
      return { ok: false, error: text };
    }
    await logSentMessage(kind, "self", message);
    return { ok: true };
  } catch (err) {
    console.error("Twilio sendDirectText error:", err);
    return { ok: false, error: String(err) };
  }
}

const OPT_IN_MESSAGE =
  `${MESSAGE_PREFIX} You're opted in to text updates for the ${APP_NAME} ${APP_TAGLINE} pool` +
  (SITE_HOST ? ` (${SITE_HOST})` : "") +
  " — draft turn alerts, pick updates, and a weekly recap. " +
  "Msg frequency varies, msg & data rates may apply. Reply STOP to opt out, HELP for help.";

/**
 * Sends the one-time opt-in confirmation directly to a newly-added phone
 * number (1:1, via the plain Messages API — the group Conversation may
 * not exist yet at this point). Call only when a phone number is first
 * set, not on every edit. No-ops/logs on failure, same as sendGroupText.
 */
export async function sendOptInConfirmation(phone: string): Promise<void> {
  const auth = twilioAuthHeader();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!auth || !fromNumber) return;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, From: fromNumber, Body: OPT_IN_MESSAGE }),
    });
    if (!res.ok) {
      console.error("Twilio sendOptInConfirmation failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Twilio sendOptInConfirmation error:", err);
  }
}
