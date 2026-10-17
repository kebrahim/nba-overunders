import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shuffledOrder } from "@/lib/domain/draft";
import { sendDirectText } from "@/lib/notify/sms";
import { pickLabel, pickText, welcomeText } from "@/lib/notify/draft-texts";

// Texts the commissioner (only) a sample of a draft group text, built
// from the real players and lines, so the wording can be checked before
// the draft starts. The real draft order is drawn when the draft starts,
// so the sample uses a throwaway shuffle.
type Kind = "welcome" | "pick";

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
  if (!profile.phone) {
    return NextResponse.json({ error: "Add your own phone number on your profile first." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const kind: Kind = body?.kind;
  if (kind !== "welcome" && kind !== "pick") {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  const { data: players } = await supabase.from("profiles").select("display_name").eq("is_demo", false);
  const names = shuffledOrder((players ?? []).map((p) => p.display_name));
  if (names.length < 2) {
    return NextResponse.json({ error: "Add the players first." }, { status: 400 });
  }

  let message: string;
  if (kind === "welcome") {
    message = welcomeText(names);
  } else {
    const { data: team } = await supabase
      .from("teams")
      .select("name, win_total_line")
      .order("win_total_line", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    message = pickText({
      pickNumber: 1,
      round: 1,
      pickerName: names[0],
      label: pickLabel(team?.name ?? "Boston Celtics", "over", team?.win_total_line ?? null),
      nextName: names[1],
    });
  }

  const result = await sendDirectText(profile.phone, message, `draft_${kind}_test`);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, message });
}
