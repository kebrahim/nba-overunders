import type { ReactNode } from "react";

/**
 * Collapsible admin section built on native <details>/<summary> — no
 * client JS needed, so this stays usable from the server-rendered
 * admin page. Defaults open; the point is just to let the commissioner
 * collapse sections they don't need right now, since the page has
 * grown to seven of these.
 */
export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 marker:hidden [&::-webkit-details-marker]:hidden">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">{title}</h2>
        <span className="text-ink-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </details>
  );
}
