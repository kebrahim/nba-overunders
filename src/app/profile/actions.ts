"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsPhone } from "@/lib/domain/phone";
import { sendOptInConfirmation } from "@/lib/notify/sms";

export interface ProfileFormState {
  error: string | null;
  success: boolean;
}

export async function saveDisplayName(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: false };

  const { data: profile } = await supabase.from("profiles").select("is_demo").eq("id", user.id).single();
  if (profile?.is_demo) {
    return { error: "Demo accounts are read-only.", success: false };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Enter a display name.", success: false };
  if (displayName.length > 40) return { error: "Keep it under 40 characters.", success: false };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);
  if (error) return { error: error.message, success: false };

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/my-picks");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  return { error: null, success: true };
}

/**
 * Requests an email change via Supabase Auth's own confirmation flow —
 * auth.users.email (and, via the sync_profile_email trigger from
 * migration 0009, profiles.email) doesn't actually change until the
 * user clicks the confirmation link Supabase sends. Never writes
 * profiles.email directly, so the two can't drift out of sync.
 */
export async function changeEmail(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: false };

  const { data: profile } = await supabase.from("profiles").select("is_demo").eq("id", user.id).single();
  if (profile?.is_demo) {
    return { error: "Demo accounts are read-only.", success: false };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter an email address.", success: false };

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message, success: false };

  return { error: null, success: true };
}

export async function savePhone(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_demo, phone")
    .eq("id", user.id)
    .single();
  if (profile?.is_demo) {
    return { error: "Demo accounts are read-only.", success: false };
  }

  const raw = String(formData.get("phone") ?? "").trim();
  const phone = raw ? normalizeUsPhone(raw) : null;
  if (raw && !phone) {
    return { error: "Enter a valid 10-digit US phone number.", success: false };
  }

  // The checkbox is the actual opt-in — a phone number is never saved
  // without it checked, so consent is enforced here, not just claimed.
  if (phone && formData.get("consent") !== "on") {
    return { error: "Check the box to opt in before saving your number.", success: false };
  }

  const { error } = await supabase.from("profiles").update({ phone }).eq("id", user.id);
  if (error) return { error: error.message, success: false };

  if (phone && !profile?.phone) {
    await sendOptInConfirmation(phone);
  }

  revalidatePath("/profile");
  revalidatePath("/admin");
  return { error: null, success: true };
}
