import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { MobileNav } from "./mobile-nav";
import { APP_NAME } from "@/lib/config/app";

const LINKS = [
  { href: "/draft", label: "Draft" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/my-picks", label: "My Picks" },
  { href: "/standings", label: "Standings" },
  { href: "/profile", label: "Profile" },
];

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let isCommissioner = false;
  let isDemo = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, is_commissioner, is_demo")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? user.email ?? null;
    isCommissioner = profile?.is_commissioner ?? false;
    isDemo = profile?.is_demo ?? false;
  }

  return (
    <header className="relative border-b-4 border-accent bg-surface">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-semibold tracking-wide text-accent uppercase"
          >
            <span aria-hidden>🏀</span>
            {APP_NAME}
          </Link>
          {isDemo && (
            <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">
              Demo — read only
            </span>
          )}
        </div>

        {user && (
          <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            {isCommissioner && (
              <Link
                href="/admin"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Admin
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          {user && <MobileNav links={LINKS} showAdmin={isCommissioner} />}
          {user ? (
            <>
              <Link href="/profile" className="hidden text-ink-muted hover:text-ink sm:inline">
                {displayName}
              </Link>
              <form action={signOut}>
                <button type="submit" className="font-medium hover:text-accent">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="font-medium hover:text-accent">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
