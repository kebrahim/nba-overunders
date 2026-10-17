import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSmsConversationSid, sendGroupText } from "@/lib/notify/sms";

export async function POST() {
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

  const conversationSid = await getSmsConversationSid();
  if (!conversationSid) {
    return NextResponse.json(
      { error: "No group text thread yet — create one first." },
      { status: 400 },
    );
  }

  const result = await sendGroupText(
    "This is a test message to the group thread. If everyone got this, it's working!",
    "connectivity_test",
    { force: true },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
