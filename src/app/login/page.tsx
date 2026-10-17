import { LoginForm } from "./login-form";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/app";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🏀
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-wide text-ink uppercase">
          {APP_NAME}
        </h1>
        <p className="font-heading text-lg tracking-wide text-accent uppercase">{APP_TAGLINE}</p>
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to draft, predict, and track the leaderboard.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
