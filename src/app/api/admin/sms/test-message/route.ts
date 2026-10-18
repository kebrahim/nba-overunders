import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSmsConversationSid, sendDirectText, sendGroupText } from "@/lib/notify/sms";
import {
  findLatestRecapWeek,
  generateSeasonOpenerMessage,
  generateWeeklyMessage,
} from "@/lib/notify/weekly-recap";

// Sends the same weekly recap + preview text the Monday sync job sends,
// on demand, to preview tone changes or verify Twilio wiring. Covers the
// latest week with any final game (the real job waits for a full week),
// or, before any game is final, the week 1 preview the season opens with.
type Target = "self" | "group";

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
    .select("is_commissioner, phone")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) {
    return NextResponse.json({ error: "Commissioner only." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const target: Target = body?.target;
  if (target !== "self" && target !== "group") {
    return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  }

  const week = await findLatestRecapWeek();
  const message = week == null ? await generateSeasonOpenerMessage() : await generateWeeklyMessage(week);
  if (!message) {
    return NextResponse.json(
      {
        error:
          "Couldn't generate a message — check ANTHROPIC_API_KEY is set, and that there's relevant game/pick data in the database.",
      },
      { status: 400 },
    );
  }

  if (target === "self") {
    if (!profile.phone) {
      return NextResponse.json(
        { error: "Add your own phone number on your profile first." },
        { status: 400 },
      );
    }
    const result = await sendDirectText(profile.phone, message, "weekly_test");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  } else {
    const conversationSid = await getSmsConversationSid();
    if (!conversationSid) {
      return NextResponse.json(
        { error: "No group text thread yet — create one first." },
        { status: 400 },
      );
    }
    const result = await sendGroupText(message, "weekly_test", { force: true });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message });
}
