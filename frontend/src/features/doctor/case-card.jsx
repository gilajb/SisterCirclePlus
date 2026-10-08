import { Check, MapPin } from "lucide-react";
import { TriageBadge } from "@/components/shared/risk-badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One referral in the doctor inbox. Shows the clinical picture only — never who submitted it. */
export function CaseCard({ submission, busy, onClaim, onRelease, onResolve }) {
  const condition = submission.ai_result?.conditions?.[0]?.name;
  const mine = submission.claimed_by_me;

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-card px-[18px] py-4",
        mine && "border-gold",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <h3 className="text-sm font-bold">
            Case #{submission.id}
            {submission.age ? ` — Age ${submission.age}` : ""}
          </h3>
          {submission.location ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {submission.location}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {mine ? (
            <span className="rounded-full border border-gold-border bg-gold-light px-2.5 py-[3px] text-[10px] font-bold whitespace-nowrap text-gold-dark uppercase">
              You're handling this
            </span>
          ) : null}
          <TriageBadge tier={submission.risk_tier} />
        </div>
      </div>

      {condition ? <p className="text-[13px] font-bold">{condition}</p> : null}

      {submission.symptoms?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {submission.symptoms.slice(0, 5).map((symptom) => (
            <li
              key={symptom}
              className="rounded-full border bg-background px-2.5 py-[3px] text-xs text-body"
            >
              {symptom}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">{timeAgo(submission.created_at)}</p>

      <div className="mt-1 flex gap-2">
        {mine ? (
          <>
            <Button
              size="xl"
              onClick={onResolve}
              disabled={busy}
              className="h-10 flex-1 rounded-lg bg-success text-[13px] hover:bg-success/90"
            >
              {busy ? (
                "…"
              ) : (
                <>
                  <Check aria-hidden="true" /> Mark Resolved
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={onRelease}
              disabled={busy}
              className="h-10 rounded-lg bg-card px-3.5 text-[13px] font-semibold text-body"
            >
              Release
            </Button>
          </>
        ) : (
          <Button
            variant="mauve"
            size="xl"
            onClick={onClaim}
            disabled={busy}
            className="h-10 flex-1 rounded-lg text-[13px]"
          >
            {busy ? "Claiming…" : "Claim Case"}
          </Button>
        )}
      </div>
    </article>
  );
}
