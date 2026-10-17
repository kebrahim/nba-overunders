import { getCurrentProfile } from "@/lib/supabase/current-user";
import { DisplayNameForm } from "./display-name-form";
import { EmailForm } from "./email-form";
import { PhoneForm } from "./phone-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p>Sign in to edit your profile.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-12 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
          Profile
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {profile.is_demo
            ? "Demo accounts are read-only — sign up for a real account to edit these."
            : "Update your display name, email, and phone number."}
        </p>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Display name
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Shown on the leaderboard, standings, and everywhere else picks are listed.
        </p>
        <div className="mt-4">
          <DisplayNameForm existing={profile.display_name} locked={profile.is_demo} />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">Email</h2>
        <p className="mt-1 text-sm text-ink-muted">Used to sign in.</p>
        <div className="mt-4">
          <EmailForm existing={profile.email} locked={profile.is_demo} />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Phone &amp; text updates
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Optional — get draft turn alerts, pick updates, and score notifications by text. See
          our{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="text-accent hover:underline">
            Terms &amp; Conditions
          </a>
          .
        </p>
        <div className="mt-4">
          <PhoneForm existing={profile.phone} locked={profile.is_demo} />
        </div>
      </div>
    </main>
  );
}
