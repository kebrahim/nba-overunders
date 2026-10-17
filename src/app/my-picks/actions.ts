"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DIVISIONS } from "@/lib/domain/divisions";
import { picksLocked } from "@/lib/domain/season";
import type { Division } from "@/lib/supabase/types";

export interface PredictionFormState {
  error: string | null;
  success: boolean;
}

export async function saveDivisionPredictions(
  _prevState: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: false };
  if (picksLocked()) {
    return { error: "Division picks are locked — the season has started.", success: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_demo")
    .eq("id", user.id)
    .single();
  if (profile?.is_demo) {
    return { error: "Demo accounts are read-only.", success: false };
  }

  const rows = DIVISIONS.map((division) => {
    const teamId = formData.get(`division:${division}`);
    return teamId ? { user_id: user.id, division: division as Division, predicted_team_id: Number(teamId) } : null;
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return { error: "Pick at least one division.", success: false };

  const { error } = await supabase
    .from("division_predictions")
    .upsert(rows, { onConflict: "user_id,division" });

  if (error) return { error: error.message, success: false };

  revalidatePath("/my-picks");
  return { error: null, success: true };
}

export async function saveTiebreaker(
  _prevState: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: false };
  if (picksLocked()) {
    return { error: "The tiebreaker guess is locked — the season has started.", success: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_demo")
    .eq("id", user.id)
    .single();
  if (profile?.is_demo) {
    return { error: "Demo accounts are read-only.", success: false };
  }

  const guess = Number(formData.get("points_guess"));
  if (!Number.isFinite(guess) || guess <= 0) {
    return { error: "Enter a positive number.", success: false };
  }

  const { error } = await supabase
    .from("tiebreaker_predictions")
    .upsert({ user_id: user.id, points_guess: guess }, { onConflict: "user_id" });

  if (error) return { error: error.message, success: false };

  revalidatePath("/my-picks");
  return { error: null, success: true };
}
