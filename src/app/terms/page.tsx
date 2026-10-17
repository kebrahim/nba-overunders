import { APP_NAME } from "@/lib/config/app";

export const metadata = {
  title: `Terms & Conditions — ${APP_NAME}`,
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent uppercase">
          Terms &amp; Conditions
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated October 2026.</p>
      </div>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">The service</h2>
        <p>
          This site runs a private, invite-only season-long NBA prediction contest for a small,
          fixed group of personal friends. It is not a public or commercial product — access is
          limited to participants invited by the contest organizer.
        </p>
      </section>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          SMS/MMS program terms
        </h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            SMS/MMS text messages are entirely optional. On the My Picks page, you may enter your
            mobile phone number and check an unchecked-by-default consent box to opt in to
            receiving updates related to the contest — draft-turn notifications, pick updates,
            and season updates — as part of a shared group text thread with the other
            participants. Declining does not affect your participation in the contest.
          </li>
          <li>Message frequency varies with contest activity. Message and data rates may apply.</li>
          <li>
            Reply <strong>STOP</strong> at any time to opt out of messages, or{" "}
            <strong>HELP</strong> for assistance. You can also opt out by removing your phone
            number from your profile on the My Picks page.
          </li>
          <li>
            Carriers are not liable for delayed or undelivered messages. Supported carriers
            include major U.S. wireless carriers; not all phones or carriers are guaranteed to be
            compatible.
          </li>
          <li>
            Your mobile number and opt-in consent are never shared or sold to third parties for
            marketing purposes — see the{" "}
            <a href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </a>{" "}
            for details.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Contest rules
        </h2>
        <p>
          Draft picks, division predictions, and scoring follow the rules described on the site
          itself. The contest organizer (commissioner) may correct data-entry mistakes, resolve
          disputes, and administer the contest at their discretion.
        </p>
      </section>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          No warranty
        </h2>
        <p>
          This site is run informally, for fun, among friends. It&apos;s provided as-is, with no
          guarantee of uptime, accuracy of synced scores, or availability, and no warranty of any
          kind.
        </p>
      </section>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Changes to these terms
        </h2>
        <p>
          These terms may be updated from time to time as the contest or site evolves. Continued
          participation after a change means you accept the updated terms.
        </p>
      </section>

      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">Contact</h2>
        <p>
          Questions about these terms? Contact the contest organizer directly — they administer
          this site and can answer or act on any request.
        </p>
      </section>
    </main>
  );
}
