import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shuffledOrder, TOTAL_ROUNDS } from "@/lib/domain/draft";
import { sendGroupText } from "@/lib/notify/sms";

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

  const { data: activeSession } = await supabase
    .from("draft_sessions")
    .select("id")
    .in("status", ["pending", "active"])
    .maybeSingle();
  if (activeSession) {
    return NextResponse.json({ error: "A draft is already in progress." }, { status: 409 });
  }

  const { data: players, error: playersError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_demo", false);
  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }
  if (!players || players.length !== 5) {
    return NextResponse.json(
      { error: `Expected 5 players, found ${players?.length ?? 0}.` },
      { status: 400 },
    );
  }

  const nameById = new Map(players.map((p) => [p.id, p.display_name]));
  const snakeOrder = shuffledOrder(players.map((p) => p.id));

  const { data: session, error } = await supabase
    .from("draft_sessions")
    .insert({
      status: "active",
      total_rounds: TOTAL_ROUNDS,
      current_round: 1,
      current_pick_index: 0,
      snake_order: snakeOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const order = snakeOrder.map((id) => nameById.get(id) ?? "?").join(" → ");
  await sendGroupText(`The draft has started! Order: ${order}. On the clock: ${nameById.get(snakeOrder[0])}.`);

  return NextResponse.json({ session });
}
