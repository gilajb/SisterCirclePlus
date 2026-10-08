import { cn } from "@/lib/utils";

const TIERS = {
  urgent: { label: "High risk", className: "bg-urgent-bg text-urgent" },
  refer: { label: "Moderate", className: "bg-refer-bg text-gold-dark" },
  monitor: { label: "Low risk", className: "bg-[#f0f4f0] text-[#5f6f5f]" },
};

export const riskLabel = (tier) => (TIERS[tier] ?? TIERS.monitor).label;

/** Small pill showing a triage tier (urgent / refer / monitor) in plain words. */
export function RiskBadge({ tier, label, className }) {
  const config = TIERS[tier] ?? TIERS.monitor;
  return (
    <span
      className={cn(
        "rounded px-2 py-[3px] text-[10px] font-bold tracking-[0.5px] whitespace-nowrap uppercase",
        config.className,
        className,
      )}
    >
      {label ?? config.label}
    </span>
  );
}

const TRIAGE = {
  urgent: { label: "Urgent", className: "border-urgent-border bg-urgent-bg text-urgent" },
  refer: { label: "Refer", className: "border-gold-border bg-refer-bg text-gold-dark" },
  monitor: { label: "Stable", className: "border-success-border bg-success-bg text-success" },
};

/** Clinician-facing pill using the triage tier's own name (urgent / refer / stable). */
export function TriageBadge({ tier, className }) {
  const config = TRIAGE[tier] ?? TRIAGE.monitor;
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-[3px] text-[11px] font-bold tracking-[0.5px] whitespace-nowrap uppercase",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
