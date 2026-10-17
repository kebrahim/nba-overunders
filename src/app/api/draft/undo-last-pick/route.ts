import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { roundForPick } from "@/lib/domain/draft";

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

  const db = createServiceRoleClient();

  const { data: session, error: sessionError } = await db
    .from("draft_sessions")
    .select("id, snake_order")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ error: "No draft found." }, { status: 404 });
  }

  const { data: lastPick, error: lastPickError } = await db
    .from("draft_picks")
    .select("id, pick_number")
    .eq("session_id", session.id)
    .order("pick_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastPickError) {
    return NextResponse.json({ error: lastPickError.message }, { status: 500 });
  }
  if (!lastPick) {
    return NextResponse.json({ error: "No picks to undo." }, { status: 400 });
  }

  const { error: deleteError } = await db.from("draft_picks").delete().eq("id", lastPick.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const newPickIndex = lastPick.pick_number - 1;
  const { error: updateError } = await db
    .from("draft_sessions")
    .update({
      current_pick_index: newPickIndex,
      current_round: roundForPick(lastPick.pick_number, session.snake_order.length),
      status: "active",
      completed_at: null,
    })
    .eq("id", session.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
