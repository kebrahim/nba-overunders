import { APP_NAME } from "@/lib/config/app";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSmsConversationSid, setSmsConversationSid } from "@/lib/notify/sms";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_commissioner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) {
    return NextResponse.json({ error: "Commissioner only." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const recreate = body?.recreate === true;

  const existingSid = await getSmsConversationSid();
  if (existingSid && !recreate) {
    return NextResponse.json({ conversationSid: existingSid, alreadyExists: true });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!accountSid || !authToken || !fromNumber || !messagingServiceSid) {
    return NextResponse.json(
      {
        error:
          "Twilio isn't configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TWILIO_MESSAGING_SERVICE_SID.",
      },
      { status: 500 },
    );
  }

  const db = createServiceRoleClient();
  const { data: players, error: playersError } = await db
    .from("profiles")
    .select("id, display_name, phone")
    .eq("is_demo", false);
  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }
  if (!players || players.length === 0) {
    return NextResponse.json({ error: "No participants found." }, { status: 400 });
  }
  const missingPhones = players.filter((p) => !p.phone);
  if (missingPhones.length > 0) {
    return NextResponse.json(
      {
        error: `Missing phone numbers for: ${missingPhones.map((p) => p.display_name).join(", ")}. Everyone needs to add theirs on My Picks first.`,
      },
      { status: 400 },
    );
  }

  const authHeader = {
    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const createRes = await fetch("https://conversations.twilio.com/v1/Conversations", {
    method: "POST",
    headers: authHeader,
    body: new URLSearchParams({
      FriendlyName: `${APP_NAME} Pool`,
      MessagingServiceSid: messagingServiceSid,
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    return NextResponse.json(
      { error: created.message ?? "Failed to create the Twilio conversation." },
      { status: 500 },
    );
  }
  const conversationSid = created.sid as string;

  for (const player of players) {
    // Only Address, no ProjectedAddress: this participant is a real phone
    // joining natively from their own number. ProjectedAddress is for a
    // *different* participant type (a chat/app identity given a Twilio
    // number as its avatar) — combining the two isn't a valid binding
    // shape and is what caused "Invalid messaging binding address."
    // The Messaging Service attached to the Conversation supplies the
    // shared sending number automatically.
    const participantRes = await fetch(
      `https://conversations.twilio.com/v1/Conversations/${conversationSid}/Participants`,
      {
        method: "POST",
        headers: authHeader,
        body: new URLSearchParams({
          "MessagingBinding.Address": player.phone!,
        }),
      },
    );
    if (!participantRes.ok) {
      const errorBody = await participantRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: `Created the thread but failed to add ${player.display_name} (number on file: "${player.phone}", sending from: "${fromNumber}"): ${errorBody.message ?? participantRes.status}`,
          twilioError: errorBody,
        },
        { status: 500 },
      );
    }
  }

  // An "unattached" participant — ProjectedAddress only, no Address or
  // Identity — representing the app itself as a sender. Without this,
  // posting a Message with no matching participant author fails with
  // error 50513 ("Message author should be among Group MMS participants").
  const botParticipantRes = await fetch(
    `https://conversations.twilio.com/v1/Conversations/${conversationSid}/Participants`,
    {
      method: "POST",
      headers: authHeader,
      body: new URLSearchParams({ "MessagingBinding.ProjectedAddress": fromNumber }),
    },
  );
  if (!botParticipantRes.ok) {
    const errorBody = await botParticipantRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        error: `Created the thread but failed to add the sending number "${fromNumber}" as a participant: ${errorBody.message ?? botParticipantRes.status}`,
        twilioError: errorBody,
      },
      { status: 500 },
    );
  }

  await setSmsConversationSid(conversationSid);

  return NextResponse.json({ conversationSid });
}
