import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isDraftComplete, roundForPick, userIdOnTheClock } from "@/lib/domain/draft";
import { sendGroupText } from "@/lib/notify/sms";
import type { Side } from "@/lib/supabase/types";

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
    .select("is_demo, is_commissioner")
    .eq("id", user.id)
    .single();
  if (profile?.is_demo) {
    return NextResponse.json({ error: "Demo accounts are read-only." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId as string | undefined;
  const teamId = Number(body?.teamId);
  const side = body?.side as Side | undefined;
  if (!sessionId || !Number.isFinite(teamId) || (side !== "over" && side !== "under")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: session, error: sessionError } = await db
    .from("draft_sessions")
    .select("id, status, snake_order, current_pick_index, total_rounds")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) {
    return NextResponse.json({ error: "Draft session not found." }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "This draft isn't active." }, { status: 409 });
  }

  const onTheClock = userIdOnTheClock(session.snake_order, session.current_pick_index);
  if (!onTheClock) {
    return NextResponse.json({ error: "This draft isn't accepting picks." }, { status: 409 });
  }
  if (onTheClock !== user.id && !profile?.is_commissioner) {
    return NextResponse.json({ error: "It's not your turn." }, { status: 403 });
  }

  const pickNumber = session.current_pick_index + 1;
  const round = roundForPick(pickNumber, session.snake_order.length);

  const { data: pick, error: pickError } = await db
    .from("draft_picks")
    .insert({
      session_id: sessionId,
      user_id: onTheClock,
      team_id: teamId,
      side,
      round,
      pick_number: pickNumber,
    })
    .select()
    .single();

  if (pickError) {
    if (pickError.code === "23505") {
      return NextResponse.json(
        { error: "That team/side was just taken, or this pick already happened." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: pickError.message }, { status: 500 });
  }

  const nextPickIndex = session.current_pick_index + 1;
  const complete = isDraftComplete(nextPickIndex, session.snake_order.length);

  const { error: updateError } = await db
    .from("draft_sessions")
    .update({
      current_pick_index: nextPickIndex,
      current_round: roundForPick(nextPickIndex + 1, session.snake_order.length),
      status: complete ? "completed" : "active",
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const [{ data: team }, { data: picker }] = await Promise.all([
    db.from("teams").select("name, win_total_line").eq("id", teamId).single(),
    db.from("profiles").select("display_name").eq("id", onTheClock).single(),
  ]);
  const teamLabel = team
    ? `${team.name} ${side}${team.win_total_line != null ? ` ${team.win_total_line}` : ""}`
    : `team ${teamId} ${side}`;

  if (complete) {
    await sendGroupText(`${picker?.display_name ?? "Someone"} took ${teamLabel}. Draft complete! 🏆`);
  } else {
    const nextOnTheClock = userIdOnTheClock(session.snake_order, nextPickIndex);
    const { data: nextPicker } = nextOnTheClock
      ? await db.from("profiles").select("display_name").eq("id", nextOnTheClock).single()
      : { data: null };
    await sendGroupText(
      `${picker?.display_name ?? "Someone"} took ${teamLabel}. On the clock: ${nextPicker?.display_name ?? "?"}.`,
    );
  }

  return NextResponse.json({ pick });
}
