import { createClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = "id, display_name, email, phone, is_commissioner, is_demo";

/**
 * The signed-in user's profile, or null if signed out. Accounts are
 * shared with the NFL app, so an account that hasn't used Hardwood yet
 * has no row in the players-filtered profiles view: the first visit here
 * joins it to the contest (nba.players) and then reads it again.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  if (profile) return profile;

  const { error } = await supabase
    .from("players")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) {
    console.error("getCurrentProfile: joining players failed:", error);
    return null;
  }

  const { data: joined } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  return joined;
}
