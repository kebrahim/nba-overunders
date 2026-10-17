"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DIVISIONS } from "@/lib/domain/divisions";
import { setSmsEnabled } from "@/lib/notify/sms";
import { RECAP_TONES, setRecapTone, type RecapTone } from "@/lib/notify/weekly-recap";

export interface AdminFormState {
  error: string | null;
  success: boolean;
}

export async function saveWinTotalLines(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_commissioner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) return { error: "Commissioner only.", success: false };

  const updates = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("line:"))
    .map(([key, value]) => ({
      id: Number(key.replace("line:", "")),
      win_total_line: value === "" ? null : Number(value),
      win_total_source: "manual" as const,
      win_total_updated_at: new Date().toISOString(),
    }))
    .filter((row) => Number.isFinite(row.id));

  for (const row of updates) {
    const { error } = await supabase
      .from("teams")
      .update({
        win_total_line: row.win_total_line,
        win_total_source: row.win_total_source,
        win_total_updated_at: row.win_total_updated_at,
      })
      .eq("id", row.id);
    if (error) return { error: error.message, success: false };
  }

  revalidatePath("/admin");
  revalidatePath("/standings");
  return { error: null, success: true };
}

export async function saveDivisionWinners(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_commissioner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) return { error: "Commissioner only.", success: false };

  for (const division of DIVISIONS) {
    const raw = formData.get(`division:${division}`);
    const teamId = raw ? Number(raw) : null;

    if (teamId) {
      const { error } = await supabase
        .from("division_winners")
        .upsert({ division, team_id: teamId }, { onConflict: "division" });
      if (error) return { error: error.message, success: false };
    } else {
      const { error } = await supabase.from("division_winners").delete().eq("division", division);
      if (error) return { error: error.message, success: false };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/my-picks");
  return { error: null, success: true };
}

export async function saveRecapTone(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_commissioner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) return { error: "Commissioner only.", success: false };

  const tone = formData.get("tone");
  if (!RECAP_TONES.some((t) => t.id === tone)) {
    return { error: "Invalid tone.", success: false };
  }

  await setRecapTone(tone as RecapTone);

  revalidatePath("/admin");
  return { error: null, success: true };
}

export async function saveSmsEnabled(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_commissioner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_commissioner) return { error: "Commissioner only.", success: false };

  await setSmsEnabled(formData.get("enabled") === "true");

  revalidatePath("/admin");
  return { error: null, success: true };
}
