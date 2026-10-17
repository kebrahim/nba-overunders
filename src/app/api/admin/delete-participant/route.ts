import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Deletes an auth user (profiles.id cascades from auth.users, so the
// profile row goes with it). Blocked if they've already made any picks —
// draft_picks/division_predictions/tiebreaker_predictions.user_id don't
// cascade, and removing a drafted player's picks would corrupt
// draft_sessions.snake_order / pick_number sequencing anyway.
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

  const { userId } = await request.json();
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account here." },
      { status: 400 },
    );
  }

  const db = createServiceRoleClient();

  const [draftPicks, divisionPicks, tiebreaker] = await Promise.all([
    db.from("draft_picks").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db
      .from("division_predictions")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("tiebreaker_predictions")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if ((draftPicks.count ?? 0) > 0 || (divisionPicks.count ?? 0) > 0 || (tiebreaker.count ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Can't delete — this person has already made picks. Use Reset draft (or clear their division/tiebreaker picks) first if you're sure.",
      },
      { status: 400 },
    );
  }

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
