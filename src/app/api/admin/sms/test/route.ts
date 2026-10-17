import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendDirectText } from "@/lib/notify/sms";

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
    .select("is_commissioner, phone")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) {
    return NextResponse.json({ error: "Commissioner only." }, { status: 403 });
  }
  if (!profile.phone) {
    return NextResponse.json(
      { error: "Add your own phone number on My Picks first." },
      { status: 400 },
    );
  }

  // Plain Messages API, not Conversations — a one-off 1:1 text to just
  // yourself, so you can confirm credentials/number work before every
  // participant has a phone number on file (Conversations setup requires
  // all 5).
  const result = await sendDirectText(
    profile.phone,
    "this is a test text. If you got this, Twilio's wired up correctly.",
    "connectivity_test",
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
