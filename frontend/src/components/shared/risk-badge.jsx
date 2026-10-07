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
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
