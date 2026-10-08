import { CircleCheck, Siren, TriangleAlert } from "lucide-react";

/** Presentation for each triage tier returned by the backend. */
export const RISK_CONFIG = {
  refer: {
    label: "Assessment priority: Refer",
    icon: TriangleAlert,
    title: "Analysis Complete",
    subtitle: "Your symptoms suggest a consultation with a GP would be beneficial.",
    banner: "border-gold-border border-l-gold bg-refer-bg",
    text: "text-gold-dark",
  },
  urgent: {
    label: "Assessment priority: Urgent",
    icon: Siren,
    title: "Urgent Attention Needed",
    subtitle:
      "Your symptoms require clinical attention within 24–48 hours. Please seek care today.",
    banner: "border-danger-border border-l-[#ef4444] bg-danger-bg",
    text: "text-danger",
  },
  monitor: {
    label: "Assessment priority: Monitor",
    icon: CircleCheck,
    title: "Analysis Complete",
    subtitle: "Your symptoms are within a manageable range. Continue tracking.",
    banner: "border-success-border border-l-[#2ecc71] bg-success-bg",
    text: "text-success",
  },
};

export const riskConfig = (tier) => RISK_CONFIG[tier] ?? RISK_CONFIG.monitor;

/** Builds and downloads a plain-text copy of the analysis. */
export function downloadReport(result) {
  const lines = [
    "SISTERCIRCLE+ HEALTH ANALYSIS REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    "=".repeat(48),
    "",
    `RISK ASSESSMENT: ${result.risk_tier?.toUpperCase() ?? "—"}`,
    "",
    "POTENTIAL CONDITIONS:",
    ...(result.conditions ?? []).map(
      (c, i) => `  ${i + 1}. ${c.name} (${c.confidence}% confidence)\n     ${c.description}`,
    ),
    "",
    "NEXT STEPS:",
    ...(result.next_steps ?? []).map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "A NOTE FROM YOUR SISTERCIRCLE+ TEAM:",
    `  ${result.team_note ?? ""}`,
    "",
    "=".repeat(48),
    "DISCLAIMER: This AI-generated analysis is for informational purposes only",
    "and does not constitute medical advice, diagnosis, or treatment.",
    "Always consult a qualified healthcare provider.",
    "",
    "© 2026 SisterCircle+. Medical Clarity through Clinical Warmth.",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sistercircle-report-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
