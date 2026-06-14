"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  bg: "#F7F3F0",
  white: "#FFFFFF",
  pink: "#D4547A",
  pinkLight: "#F9C4D2",
  pinkPale: "#FDE8EE",
  gold: "#C9A84C",
  goldLight: "#F5EDD6",
  goldBorder: "#E8D5A0",
  charcoal: "#1A1A1A",
  body: "#444444",
  muted: "#888888",
  border: "#E8E0DC",
  footerBg: "#1A1A1A",
  mauve: "#6B3A4A",
  referAmber: "#92720A",
  referBg: "#FFFBEB",
  referBorder: "#E8D5A0",
  moderateBg: "#FFF8E8",
  progressBg: "#E8E0DC",
};

// ---------------------------------------------------------------------------
// Risk tier config — maps API risk_tier to visual treatment
// ---------------------------------------------------------------------------

const RISK_CONFIG = {
  refer: {
    label: "ASSESSMENT PRIORITY: REFER",
    icon: "⚠",
    title: "Analysis Complete",
    subtitle: "Your symptoms suggest a consultation with a GP would be beneficial.",
    bg: C.referBg,
    border: C.referBorder,
    textColor: C.referAmber,
    borderLeft: "#C9A84C",
  },
  urgent: {
    label: "ASSESSMENT PRIORITY: URGENT",
    icon: "🚨",
    title: "Urgent Attention Needed",
    subtitle: "Your symptoms require clinical attention within 24–48 hours. Please seek care today.",
    bg: "#FEF2F2",
    border: "#FECACA",
    textColor: "#B91C1C",
    borderLeft: "#EF4444",
  },
  monitor: {
    label: "ASSESSMENT PRIORITY: MONITOR",
    icon: "✓",
    title: "Analysis Complete",
    subtitle: "Your symptoms are within a manageable range. Continue tracking.",
    bg: "#F0FFF4",
    border: "#A8D5B5",
    textColor: "#2E7D52",
    borderLeft: "#2ECC71",
  },
};

// ---------------------------------------------------------------------------
// Condition card
// ---------------------------------------------------------------------------

const BAR_COLORS = [C.pink, C.gold, C.mauve, "#5B8DB8", "#7BB585"];

function ConditionCard({ condition, index, mobile }) {
  const barColor = condition.barColor || BAR_COLORS[index % BAR_COLORS.length];
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderLeft: mobile ? `3px solid ${C.mauve}` : "none",
      borderRadius: "12px",
      padding: mobile ? "20px" : "24px",
      display: "flex", flexDirection: "column", gap: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ fontSize: mobile ? "17px" : "20px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>
          {condition.name}
        </div>
        <div style={{
          fontSize: mobile ? "15px" : "13px", fontWeight: "700",
          color: mobile ? C.charcoal : C.muted,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "nowrap",
          background: mobile ? "#F0F0F0" : "transparent",
          padding: mobile ? "3px 10px" : "0",
          borderRadius: mobile ? "6px" : "0",
        }}>
          {mobile ? `${condition.confidence}%` : "Confidence"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, height: "6px", background: C.progressBg, borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ width: `${condition.confidence}%`, height: "100%", background: barColor, borderRadius: "100px" }} />
        </div>
        {!mobile && (
          <span style={{ fontSize: "22px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", minWidth: "48px", textAlign: "right" }}>
            {condition.confidence}%
          </span>
        )}
      </div>
      <p style={{ fontSize: "14px", lineHeight: "1.65", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {condition.description}
      </p>
      {condition.tags && condition.tags.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {condition.tags.map((tag) => (
            <span key={tag} style={{
              background: C.pinkPale, color: C.pink,
              fontSize: "12px", fontWeight: "600",
              padding: "4px 12px", borderRadius: "100px",
              fontFamily: "system-ui, sans-serif",
            }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const spinStyle = `@keyframes sc-spin { to { transform: rotate(360deg); } }`;

function Spinner({ color = C.white }) {
  return (
    <span style={{
      display: "inline-block", width: "15px", height: "15px",
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTopColor: color, borderRadius: "50%",
      animation: "sc-spin 0.7s linear infinite",
    }} />
  );
}

// ---------------------------------------------------------------------------
// Download helper — plain text report
// ---------------------------------------------------------------------------

function downloadReport(result) {
  const lines = [
    "SISTERCIRCLE+ HEALTH ANALYSIS REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    "=".repeat(48),
    "",
    `RISK ASSESSMENT: ${result.risk_tier?.toUpperCase() ?? "—"}`,
    "",
    "POTENTIAL CONDITIONS:",
    ...(result.conditions ?? []).map(
      (c, i) => `  ${i + 1}. ${c.name} (${c.confidence}% confidence)\n     ${c.description}`
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load result from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("sistercircle_result");
    if (!raw) {
      router.replace("/symptom-check");
      return;
    }
    try {
      setResult(JSON.parse(raw));
    } catch {
      router.replace("/symptom-check");
    }
  }, [router]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Save to dashboard
  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      await api.post("/api/symptoms/save/", {
        submission_id: result?.submission_id ?? null,
      });
      setSaved(true);
      // Brief pause so the user sees the confirmation, then navigate
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err) {
      setSaveError("Could not save to dashboard. Please try again.");
      setSaving(false);
    }
  }

  if (!result) return null;

  const risk = RISK_CONFIG[result.risk_tier] ?? RISK_CONFIG.monitor;
  const conditions = result.conditions ?? [];
  const nextSteps = result.next_steps ?? [];
  const teamNote = result.team_note ?? "";

  // ── Save button shared label
  const saveLabel = saved ? "✓ Saved!" : saving ? <><Spinner /> Saving…</> : "Save to My Health Dashboard";

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: C.bg, color: C.charcoal, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{spinStyle}</style>

      {/* NAV — desktop */}
      {!mobile ? (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 48px", background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <Link href="/" style={{ fontSize: "20px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <Link href="/dashboard" style={{ fontSize: "15px", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", fontWeight: "400" }}>Dashboard</Link>
            <Link href="/symptom-check" style={{ fontSize: "15px", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", borderBottom: `2px solid ${C.pink}`, paddingBottom: "2px", fontWeight: "600" }}>Symptom Check</Link>
            <span style={{ fontSize: "15px", cursor: "pointer", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>Resources</span>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#C4A882" }} />
          </div>
        </nav>
      ) : (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: C.white,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <Link href="/symptom-check" style={{ fontSize: "20px", color: C.charcoal, textDecoration: "none" }}>←</Link>
          <span style={{ fontSize: "17px", fontWeight: "700", color: C.mauve, fontFamily: "Georgia, serif" }}>Analysis</span>
          <span onClick={() => downloadReport(result)} style={{ fontSize: "18px", cursor: "pointer", color: C.charcoal }}>↗</span>
        </nav>
      )}

      <div style={{ maxWidth: mobile ? "100%" : "1100px", margin: "0 auto", padding: mobile ? "24px 20px 100px" : "40px 48px 60px" }}>

        {/* RISK BANNER */}
        <div style={{
          background: risk.bg,
          border: `1px solid ${risk.border}`,
          borderLeft: `4px solid ${risk.borderLeft}`,
          borderRadius: "12px",
          padding: mobile ? "20px" : "24px 28px",
          marginBottom: mobile ? "24px" : "40px",
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: mobile ? "flex-start" : "center",
          gap: "16px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>{risk.icon}</span>
              <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1.2px", textTransform: "uppercase", color: risk.textColor, fontFamily: "system-ui, sans-serif" }}>
                {risk.label}
              </span>
            </div>
            <h1 style={{ fontSize: mobile ? "26px" : "28px", fontWeight: "800", color: risk.textColor, margin: 0, fontFamily: "Georgia, serif" }}>
              {risk.title}
            </h1>
            <p style={{ fontSize: "15px", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
              {risk.subtitle}
            </p>
          </div>
          {!mobile && (
            <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
              <button
                onClick={() => downloadReport(result)}
                style={{
                  background: C.white, color: C.charcoal,
                  border: `1px solid ${C.border}`, borderRadius: "8px",
                  padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                ↓ Report
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                style={{
                  background: saved ? "#2E7D52" : saving ? C.muted : C.charcoal,
                  color: C.white,
                  border: "none", borderRadius: "8px",
                  padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  cursor: saving || saved ? "not-allowed" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "background 0.2s",
                  minWidth: "220px", justifyContent: "center",
                }}
              >
                {saveLabel}
              </button>
            </div>
          )}
          {saveError && (
            <p style={{ fontSize: "13px", color: "#B91C1C", fontFamily: "system-ui, sans-serif", margin: 0 }}>{saveError}</p>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{
          display: "flex", flexDirection: mobile ? "column" : "row",
          gap: "28px", alignItems: "flex-start",
        }}>

          {/* LEFT — CONDITIONS */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
            {!mobile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                  Potential Insights
                </h2>
                <span style={{ fontSize: "18px", color: C.muted }}>📋</span>
              </div>
            )}
            {mobile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", color: C.muted, fontFamily: "system-ui, sans-serif" }}>
                  POTENTIAL INDICATORS
                </span>
                <span style={{ fontSize: "13px", color: C.pink, fontWeight: "600", fontFamily: "system-ui, sans-serif" }}>
                  {conditions.length} Result{conditions.length !== 1 ? "s" : ""} Found
                </span>
              </div>
            )}
            {conditions.map((c, i) => (
              <ConditionCard key={c.name + i} condition={c} index={i} mobile={mobile} />
            ))}
          </div>

          {/* RIGHT — WHAT TO DO NEXT (desktop) */}
          {!mobile && nextSteps.length > 0 && (
            <div style={{
              flex: "0 0 320px",
              background: C.goldLight,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: "16px",
              padding: "28px",
              display: "flex", flexDirection: "column", gap: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>☑</span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                  What to do next
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {nextSteps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: C.muted, fontFamily: "system-ui, sans-serif", minWidth: "16px", marginTop: "2px" }}>{i + 1}</span>
                    <div style={{ fontSize: "13px", lineHeight: "1.6", color: C.body, fontFamily: "system-ui, sans-serif" }}>{step}</div>
                  </div>
                ))}
              </div>
              <button style={{
                background: C.charcoal, color: C.white,
                border: "none", borderRadius: "10px",
                padding: "14px 20px", fontSize: "14px", fontWeight: "600",
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                marginTop: "4px",
              }}>
                Book Tele-health Consultation →
              </button>
            </div>
          )}
        </div>

        {/* NEXT STEPS — mobile */}
        {mobile && nextSteps.length > 0 && (
          <div style={{
            background: C.pinkPale,
            borderRadius: "16px",
            padding: "24px",
            marginTop: "24px",
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: C.mauve, margin: "0 0 16px", fontFamily: "Georgia, serif" }}>
              Next Steps
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {nextSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ color: C.mauve, fontSize: "16px", marginTop: "1px" }}>•</span>
                  <span style={{ fontSize: "14px", lineHeight: "1.6", color: C.body, fontFamily: "system-ui, sans-serif" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM NOTE — desktop */}
        {!mobile && teamNote && (
          <div style={{
            display: "flex", flexDirection: "row",
            gap: "48px", alignItems: "center",
            marginTop: "48px",
          }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "24px", fontWeight: "700", color: C.charcoal, marginBottom: "16px", fontFamily: "Georgia, serif" }}>
                A note from your SisterCircle+ team
              </h3>
              <p style={{ fontSize: "15px", lineHeight: "1.75", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                {teamNote}
              </p>
            </div>
            <div style={{
              flex: "0 0 360px", height: "200px", borderRadius: "16px",
              background: "linear-gradient(135deg, #8A7060 0%, #C4A882 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "system-ui, sans-serif" }}>
                <div style={{ fontSize: "40px", marginBottom: "6px" }}>🤝🏾</div>
                Replace with support image
              </div>
            </div>
          </div>
        )}

        {/* TEAM NOTE — mobile */}
        {mobile && teamNote && (
          <div style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: "12px", padding: "20px",
            marginTop: "24px",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: C.mauve, margin: "0 0 10px", fontFamily: "Georgia, serif" }}>
              A note from your SisterCircle+ team
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
              {teamNote}
            </p>
          </div>
        )}

        {/* DISCLAIMER */}
        <p style={{
          fontSize: "12px", color: C.muted, textAlign: "center",
          fontStyle: "italic", marginTop: mobile ? "24px" : "48px",
          lineHeight: "1.6", fontFamily: "system-ui, sans-serif",
          maxWidth: "600px", margin: mobile ? "24px auto 0" : "48px auto 0",
        }}>
          {mobile
            ? "This analysis is AI-generated for informational purposes and does not replace professional medical advice."
            : "Disclaimer: This AI-generated analysis is intended for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health providers with any questions you may have regarding a medical condition."}
        </p>
      </div>

      {/* FOOTER — desktop */}
      {!mobile && (
        <footer style={{ background: C.footerBg, padding: "40px 48px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "24px" }}>
              <div>
                <Link href="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", marginBottom: "6px", display: "block", textDecoration: "none" }}>SisterCircle+</Link>
                <div style={{ fontSize: "13px", color: "#999", fontFamily: "system-ui, sans-serif" }}>© 2026 SisterCircle+. Medical Clarity through Clinical Warmth.</div>
              </div>
              <div style={{ display: "flex", gap: "48px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Mission", "Privacy Policy"].map((l) => (
                    <span key={l} style={{ fontSize: "13px", color: "#999", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Terms of Service", "Disclaimer"].map((l) => (
                    <span key={l} style={{ fontSize: "13px", color: "#999", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* MOBILE BOTTOM ACTIONS */}
      {mobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: C.white, borderTop: `1px solid ${C.border}`,
          padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          {saveError && (
            <p style={{ fontSize: "12px", color: "#B91C1C", margin: 0, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>{saveError}</p>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                flex: 1,
                background: saved ? "#2E7D52" : saving ? C.muted : C.charcoal,
                color: C.white,
                border: "none", borderRadius: "10px",
                padding: "14px", fontSize: "15px", fontWeight: "600",
                cursor: saving || saved ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background 0.2s",
              }}
            >
              📋 {saved ? "Saved!" : saving ? "Saving…" : "Save to Dashboard"}
            </button>
            <button
              onClick={() => downloadReport(result)}
              style={{
                width: "52px", height: "52px", flexShrink: 0,
                background: C.white, color: C.mauve,
                border: `1.5px solid ${C.mauve}`, borderRadius: "10px",
                fontSize: "20px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
