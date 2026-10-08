import Link from "next/link";
import { TriageBadge } from "@/components/shared/risk-badge";
import { timeAgo } from "@/lib/format";

const HEADINGS = ["Ref ID", "Status/Risk", "Symptom Summary", "Time", "Action"];

const refOf = (submission) => `SC-${submission.id}`;

function summaryOf(submission) {
  const symptoms = (submission.symptoms ?? []).slice(0, 2).join(", ");
  return symptoms || submission.ai_result?.conditions?.[0]?.name || "Symptom Analysis";
}

/** The CHW's latest logged assessments: a table on desktop, cards on phones. */
export function RecentAssessments({ assessments }) {
  const rows = assessments.slice(0, 10);

  return (
    <>
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr className="border-b">
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-3 py-2 text-left text-xs font-bold tracking-[0.5px] text-muted-foreground uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((submission) => (
            <tr key={submission.id} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-4 text-left text-sm font-bold">
                {refOf(submission)}
              </th>
              <td className="px-3 py-4">
                <TriageBadge tier={submission.risk_tier} />
              </td>
              <td className="px-3 py-4 text-sm text-body">{summaryOf(submission)}</td>
              <td className="px-3 py-4 text-[13px] text-muted-foreground">
                {timeAgo(submission.created_at)}
              </td>
              <td className="px-3 py-4">
                <Link
                  href={`/results?id=${submission.id}`}
                  className="text-[13px] font-semibold text-primary"
                >
                  Open Case
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2.5 md:hidden">
        {rows.map((submission) => (
          <li key={submission.id}>
            <Link
              href={`/results?id=${submission.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5"
            >
              <span className="flex-1">
                <span className="block text-[15px] font-bold">{refOf(submission)}</span>
                <span className="block text-xs text-body">{summaryOf(submission)}</span>
              </span>
              <span className="text-right">
                <TriageBadge tier={submission.risk_tier} />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {timeAgo(submission.created_at)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
