import { TeamLogo } from "@/components/team-logo";
import { DeleteParticipantButton } from "./delete-participant-button";

interface Participant {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  sms_opted_out_at: string | null;
}

interface DivisionPick {
  division: string;
  teamName: string;
  teamCode: string;
}

interface DraftPick {
  pickNumber: number;
  teamName: string;
  teamCode: string;
  side: string;
}

export function Participants({
  participants,
  divisionPicksByUser,
  tiebreakerByUser,
  draftPicksByUser,
  currentUserId,
}: {
  participants: Participant[];
  divisionPicksByUser: Map<string, DivisionPick[]>;
  tiebreakerByUser: Map<string, number>;
  draftPicksByUser: Map<string, DraftPick[]>;
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      {participants.map((p) => {
        const divisionPicks = divisionPicksByUser.get(p.id) ?? [];
        const draftPicks = (draftPicksByUser.get(p.id) ?? []).sort(
          (a, b) => a.pickNumber - b.pickNumber,
        );
        const tiebreaker = tiebreakerByUser.get(p.id);

        return (
          <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading font-semibold tracking-wide text-accent uppercase">
                  {p.display_name}
                </p>
                <p className="text-sm text-ink-muted">{p.email}</p>
              </div>
              {p.id !== currentUserId && (
                <DeleteParticipantButton userId={p.id} name={p.display_name} />
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {p.sms_opted_out_at ? (
                <span className="text-bad">✗ Opted out of texts (replied STOP)</span>
              ) : p.phone ? (
                <span className="text-good">✓ Opted in to text updates</span>
              ) : (
                "No phone on file — they can add one on My Picks."
              )}
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Draft picks
                </p>
                {draftPicks.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {draftPicks.map((pick, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        {pick.teamCode && (
                          <TeamLogo code={pick.teamCode} name={pick.teamName} size={16} />
                        )}
                        #{pick.pickNumber} {pick.teamName}{" "}
                        <span className="capitalize">{pick.side}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-ink-muted">None yet</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Division picks
                </p>
                {divisionPicks.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {divisionPicks.map((pick) => (
                      <li key={pick.division} className="flex items-center gap-1.5">
                        {pick.teamCode && (
                          <TeamLogo code={pick.teamCode} name={pick.teamName} size={16} />
                        )}
                        {pick.division}: {pick.teamName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-ink-muted">None yet</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Tiebreaker
                </p>
                <p className="mt-1 text-sm">
                  {tiebreaker != null ? `${tiebreaker} points` : (
                    <span className="text-ink-muted">None yet</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      {participants.length === 0 && <p className="text-sm text-ink-muted">No participants yet.</p>}
    </div>
  );
}
