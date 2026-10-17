"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav({
  links,
  showAdmin,
}: {
  links: { href: string; label: string }[];
  showAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="flex h-8 w-8 flex-col items-center justify-center gap-1"
      >
        <span className="h-0.5 w-5 bg-ink" />
        <span className="h-0.5 w-5 bg-ink" />
        <span className="h-0.5 w-5 bg-ink" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-10 border-b border-border bg-surface px-6 py-4">
          <div className="flex flex-col gap-4 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            {showAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
