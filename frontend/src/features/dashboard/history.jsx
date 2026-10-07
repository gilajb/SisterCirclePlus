import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { RiskBadge } from "@/components/shared/risk-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOT = { urgent: "bg-primary", refer: "bg-gold", monitor: "bg-muted-foreground" };
const dotClass = (tier) => DOT[tier] ?? DOT.monitor;

export const firstCondition = (submission) => submission?.ai_result?.conditions?.[0] ?? null;
const titleOf = (submission) => firstCondition(submission)?.name ?? "Symptom Analysis";

/** Shown to free-tier users, who only receive their most recent analysis. */
export function UpgradeNotice({ totalCount, className }) {
  return (
    <div className={cn("border-gold-border bg-gold-light text-gold-dark rounded-[10px] border px-4 py-3.5", className)}>
      <p className="mb-1.5 text-[13px] font-semibold">Showing your most recent analysis only</p>
      <p className="mb-2.5 text-xs leading-normal">
        You have {totalCount} saved analyses. Upgrade to Standard to see your full history and
        trend chart.
      </p>
      <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-bold underline">
        View Plans <ArrowRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Vertical timeline of past analyses — desktop sidebar. */
export function HealthHistory({ submissions }) {
  const items = submissions.slice(0, 5);
  return (
    <ol className="flex flex-col">
      {items.map((s, i) => {
        const isLast = i === items.length - 1;
        const desc = firstCondition(s)?.description ?? "";
        return (
          <li
            key={s.id}
            className={cn(
              "relative ml-[5px] border-l-2 pl-4",
              isLast ? "border-transparent" : "pb-5"
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute top-0 -left-[7px] size-3 rounded-full", dotClass(s.risk_tier))}
            />
            <p className="text-muted-foreground mb-1 text-xs">{formatDate(s.created_at)}</p>
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h3 className="font-heading text-[15px] font-bold">{titleOf(s)}</h3>
              <RiskBadge tier={s.risk_tier} />
            </div>
            {desc ? (
              <p className="text-body mb-2 line-clamp-3 text-[13px] leading-normal">{desc}</p>
            ) : null}
            <Link
              href={`/results?id=${s.id}`}
              className="text-primary inline-flex items-center text-[13px] font-medium"
            >
              View Full Report <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact list of the latest analyses — phones. */
export function RecentReports({ submissions }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {submissions.slice(0, 3).map((s) => (
        <li key={s.id}>
          <Link
            href={`/results?id=${s.id}`}
            className="bg-card flex items-center gap-3 rounded-[10px] border px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className={cn("size-2.5 shrink-0 rounded-full", dotClass(s.risk_tier))}
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{titleOf(s)}</span>
              <span className="text-muted-foreground block text-xs">
                {formatDate(s.created_at)}
              </span>
            </span>
            <RiskBadge tier={s.risk_tier} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
