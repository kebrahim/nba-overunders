// Wording for the draft's group texts, shared by the real draft routes and
// the /admin test buttons so a test shows exactly what the group will get.
import { APP_NAME, SITE_HOST } from "@/lib/config/app";
import type { Side } from "@/lib/supabase/types";

const DRAFT_LINK = SITE_HOST ? `${SITE_HOST}/draft` : "the draft page";

/** "Celtics Over 51.5" */
export function pickLabel(teamName: string, side: Side, line: number | null): string {
  const sideLabel = side === "over" ? "Over" : "Under";
  return `${teamName} ${sideLabel}${line != null ? ` ${line}` : ""}`;
}

/** Sent to the group when the commissioner starts the draft. */
export function welcomeText(orderNames: string[]): string {
  const order = orderNames.map((name, i) => `${i + 1}. ${name}`).join("\n");
  const site = SITE_HOST || "the site";
  return [
    `Welcome to ${APP_NAME}, our NBA win total over/unders! 🏀`,
    `Sign in at ${site} with the same email and password you use for the NFL site. No new account needed.`,
    `Draft order (6-round snake):\n${order}`,
    `${orderNames[0]}, you're on the clock: ${DRAFT_LINK}`,
  ].join("\n\n");
}

/** Sent to the group after each pick. */
export function pickText({
  pickNumber,
  round,
  pickerName,
  label,
  nextName,
}: {
  pickNumber: number;
  round: number;
  pickerName: string;
  label: string;
  nextName: string | null;
}): string {
  const made = `Pick ${pickNumber} (Round ${round}): ${pickerName} took ${label}.`;
  return nextName ? `${made}\n\n${nextName}, you're up: ${DRAFT_LINK}` : `${made}\n\nDraft complete! 🏆`;
}
