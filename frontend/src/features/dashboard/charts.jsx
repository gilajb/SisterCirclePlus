import { cn } from "@/lib/utils";

const MAX_POINTS = 7;
const PAIN_MAX = 10;

/** Oldest-first slice of the most recent submissions (the API returns newest first). */
const recent = (submissions) => submissions.slice(0, MAX_POINTS).reverse();

/** Line chart of self-reported pain level. Geometry is computed, so it stays inline SVG. */
export function PainLineChart({ submissions, className }) {
  const slice = recent(submissions);
  const points = slice.map((s) => s.pain_level ?? 0);
  const labels = slice.map((s) =>
    new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  );
  // Pad to at least 2 points so the path is valid
  while (points.length < 2) {
    points.unshift(0);
    labels.unshift("—");
  }

  const w = 580;
  const h = 140;
  const pad = { left: 20, right: 20, top: 20, bottom: 30 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const baseline = h - pad.bottom;

  const pts = points.map((v, i) => ({
    x: pad.left + (i / (points.length - 1)) * iw,
    y: pad.top + ih - (v / PAIN_MAX) * ih,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts.at(-1).x} ${baseline} L ${pts[0].x} ${baseline} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Pain level over the last ${slice.length} analyses: ${points.join(", ")} out of 10`}
      className={cn("w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id="pain-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mauve)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--mauve)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pain-area)" />
      <path
        d={path}
        fill="none"
        stroke="var(--mauve)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => {
        const isLatest = i === pts.length - 1;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isLatest ? 5 : 3.5}
            fill={isLatest ? "var(--primary)" : "var(--background)"}
            stroke="var(--mauve)"
            strokeWidth="2"
          />
        );
      })}
      {labels.map((label, i) => (
        <text
          key={i}
          x={pts[i].x}
          y={h - 4}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/** Compact bar chart of the same data, used on phones. */
export function PainBarChart({ submissions, className }) {
  const slice = recent(submissions);
  const bars = [...Array(MAX_POINTS - slice.length).fill(null), ...slice];

  return (
    <div
      role="img"
      aria-label={`Pain level over the last ${slice.length} analyses: ${slice
        .map((s) => s.pain_level ?? 0)
        .join(", ")} out of 10`}
      className={cn("flex h-[100px] items-end gap-2 px-1", className)}
    >
      {bars.map((s, i) => {
        const isLatest = s !== null && i === bars.length - 1;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn("relative w-full rounded-t", isLatest ? "bg-mauve" : "bg-pink-light")}
                style={{ height: `${Math.max(((s?.pain_level ?? 0) / PAIN_MAX) * 80, 4)}px` }}
              >
                {isLatest ? (
                  <span className="absolute -top-2 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase">
              {s ? new Date(s.created_at).toLocaleDateString("en-GB", { weekday: "short" }) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
