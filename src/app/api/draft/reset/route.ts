import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Wipes the current draft session and all of its picks, returning the pool
// to "not started" so the commissioner can Start the draft again (with a
// freshly randomized order).
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
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "No draft to reset." }, { status: 400 });
  }

  const { error: deletePicksError } = await db
    .from("draft_picks")
    .delete()
    .eq("session_id", session.id);
  if (deletePicksError) {
    return NextResponse.json({ error: deletePicksError.message }, { status: 500 });
  }

  const { error: deleteSessionError } = await db
    .from("draft_sessions")
    .delete()
    .eq("id", session.id);
  if (deleteSessionError) {
    return NextResponse.json({ error: deleteSessionError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
