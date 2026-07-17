import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/axios";
import { requireAuth, decodePayload } from "@/lib/auth";

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
  footerBg: "#F0EBE8",
  mauve: "#6B3A4A",
  progressFill: "#8B5A6A",
  highRisk: "#C0392B",
  highRiskBg: "#FDECEA",
  moderate: "#C9A84C",
  moderateBg: "#FFF8E8",
  lowRisk: "#7A8A7A",
  lowRiskBg: "#F0F4F0",
  mild: "#8B6A4A",
  mildBg: "#F5EDD6",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskTierToLabel(tier) {
  const map = { urgent: "HIGH RISK", refer: "MODERATE", monitor: "LOW RISK" };
  return map[tier] ?? "LOW RISK";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMemberSince(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function getFirstConditionName(submission) {
  const conditions = submission?.ai_result?.conditions;
  if (Array.isArray(conditions) && conditions.length > 0) return conditions[0].name;
  return "—";
}

function dotColorForTier(tier) {
  const map = { urgent: C.pink, refer: C.gold, monitor: C.muted };
  return map[tier] ?? C.muted;
}

// ---------------------------------------------------------------------------
// Risk badge
// ---------------------------------------------------------------------------

function RiskBadge({ level }) {
  const config = {
    "HIGH RISK": { bg: C.highRiskBg, color: C.highRisk },
    "MODERATE":  { bg: C.moderateBg, color: C.moderate },
    "LOW RISK":  { bg: C.lowRiskBg,  color: C.lowRisk  },
    "MILD":      { bg: C.mildBg,     color: C.mild      },
  };
  const c = config[level] ?? config["LOW RISK"];
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px",
      padding: "3px 8px", borderRadius: "4px",
      fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
    }}>{level}</span>
  );
}

// ---------------------------------------------------------------------------
// Live SVG line chart driven by real pain_level data
// ---------------------------------------------------------------------------

function LineChart({ submissions, mobile }) {
  const MAX_POINTS = 7;
  // Take up to last 7 submissions, oldest first
  const slice = [...submissions].reverse().slice(0, MAX_POINTS);
  const points = slice.map(s => s.pain_level ?? 0);
  // Pad to at least 2 points so SVG path is valid
  while (points.length < 2) points.unshift(0);

  const labels = slice.map(s =>
    new Date(s.created_at).toLocaleDateString("en-GB", { month: "short" })
  );
  while (labels.length < 2) labels.unshift("—");

  const w = mobile ? 320 : 580;
  const h = 140;
  const pad = { left: 20, right: 20, top: 20, bottom: 30 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const max = 10;

  const pts = points.map((v, i) => ({
    x: pad.left + (i / (points.length - 1)) * iw,
    y: pad.top + ih - (v / max) * ih,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length-1].x} ${h - pad.bottom} L ${pts[0].x} ${h - pad.bottom} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.mauve} stopOpacity="0.15" />
          <stop offset="100%" stopColor={C.mauve} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke={C.mauve} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3.5}
          fill={i === pts.length - 1 ? C.pink : C.bg}
          stroke={C.mauve} strokeWidth="2" />
      ))}
      {labels.map((l, i) => (
        <text key={i}
          x={pad.left + (i / (labels.length - 1)) * iw}
          y={h - 4}
          textAnchor="middle" fontSize="11" fill={C.muted} fontFamily="system-ui, sans-serif">
          {l}
        </text>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (mobile) driven by real data
// ---------------------------------------------------------------------------

function BarChart({ submissions }) {
  const MAX_BARS = 7;
  const slice = [...submissions].reverse().slice(0, MAX_BARS);
  while (slice.length < MAX_BARS) slice.unshift(null);

  const max = 10;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px", padding: "0 4px" }}>
      {slice.map((s, i) => {
        const val = s?.pain_level ?? 0;
        const isLatest = s && i === slice.findLastIndex(x => x !== null);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div style={{
                width: "100%",
                height: `${Math.max((val / max) * 80, 4)}px`,
                background: isLatest ? C.mauve : C.pinkLight,
                borderRadius: "4px 4px 0 0",
                position: "relative",
              }}>
                {isLatest && (
                  <div style={{
                    position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)",
                    width: "8px", height: "8px", borderRadius: "50%", background: C.pink,
                  }} />
                )}
              </div>
            </div>
            <span style={{ fontSize: "9px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>
              {s ? new Date(s.created_at).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3).toUpperCase() : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

const skeletonStyle = `
@keyframes sc-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.sc-skel {
  background: linear-gradient(90deg, #EDE8E4 25%, #F5F0EC 50%, #EDE8E4 75%);
  background-size: 800px 100%;
  animation: sc-shimmer 1.4s infinite;
  border-radius: 8px;
}
`;

function Skel({ w = "100%", h = "20px", style = {} }) {
  return <div className="sc-skel" style={{ width: w, height: h, borderRadius: "8px", ...style }} />;
}

function DashboardSkeleton({ mobile }) {
  return (
    <div style={{ maxWidth: mobile ? "100%" : "1100px", margin: "0 auto", padding: mobile ? "24px 20px 100px" : "40px 48px 60px" }}>
      <style>{skeletonStyle}</style>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Skel w="260px" h="40px" style={{ marginBottom: "12px" }} />
        <Skel w="320px" h="18px" />
      </div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
        {[0,1,2,3].map(i => <Skel key={i} h="88px" />)}
      </div>
      {/* Chart */}
      <Skel h="200px" style={{ marginBottom: "20px" }} />
      {/* History items */}
      {[0,1,2].map(i => (
        <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <Skel w="12px" h="12px" style={{ borderRadius: "50%", flexShrink: 0, marginTop: "4px" }} />
          <div style={{ flex: 1 }}>
            <Skel w="120px" h="13px" style={{ marginBottom: "6px" }} />
            <Skel h="16px" style={{ marginBottom: "6px" }} />
            <Skel w="80%" h="13px" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ mobile }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 24px", textAlign: "center",
      gap: "16px",
    }}>
      <div style={{ fontSize: "56px" }}>🌸</div>
      <h2 style={{ fontSize: "24px", fontWeight: "700", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
        No analyses yet
      </h2>
      <p style={{ fontSize: "15px", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif", maxWidth: "340px", lineHeight: "1.6" }}>
        Your health history will appear here after your first symptom check. Let's start listening to your body.
      </p>
      <Link to="/symptom-check" style={{ textDecoration: "none" }}>
        <button style={{
          background: C.mauve, color: C.white,
          border: "none", borderRadius: "8px",
          padding: "14px 28px", fontSize: "15px", fontWeight: "600",
          cursor: "pointer", fontFamily: "system-ui, sans-serif",
          marginTop: "8px",
        }}>
          ⊕ Start Your First Analysis
        </button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [username, setUsername] = useState("");

  // Auth guard + data fetch
  useEffect(() => {
    if (!requireAuth(navigate)) return;

    // Grab username from JWT payload
    const payload = decodePayload();
    setUsername(payload?.username || payload?.name || "");

    api.get("/api/symptoms/history/")
      .then(res => setSubmissions(res.data))
      .catch(() => {}) // 401 handled by axios interceptor → redirect to /signup
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total = submissions.length;
  const latest = submissions[0] ?? null; // history endpoint returns newest first
  const lastRiskLabel = latest ? riskTierToLabel(latest.risk_tier) : "—";
  const lastCondition = latest ? getFirstConditionName(latest) : "—";

  // Member since: decode from JWT (date_joined isn't in history, so use token iat as fallback)
  const memberSince = (() => {
    const payload = decodePayload();
    const iat = payload?.iat ? new Date(payload.iat * 1000).toISOString() : null;
    return formatMemberSince(iat);
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "GOOD MORNING";
    if (h < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  })();

  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : "Sister";

  return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, color: C.charcoal, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{skeletonStyle}</style>

      {/* NAV — desktop */}
      {!mobile ? (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 48px", background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <Link to="/" style={{ fontSize: "20px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <Link to="/dashboard" style={{ fontSize: "15px", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", borderBottom: `2px solid ${C.pink}`, paddingBottom: "2px", fontWeight: "600" }}>Dashboard</Link>
            <Link to="/symptom-check" style={{ fontSize: "15px", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", fontWeight: "400" }}>Symptom Check</Link>
            <span style={{ fontSize: "15px", color: C.charcoal, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}>Resources</span>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #6B8F71, #4A7A8A)" }} />
          </div>
        </nav>
      ) : (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <Link to="/" style={{ fontSize: "20px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#C4A882", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>📱</div>
          </div>
        </nav>
      )}

      {/* LOADING SKELETON */}
      {loading && <DashboardSkeleton mobile={mobile} />}

      {/* EMPTY STATE */}
      {!loading && total === 0 && <EmptyState mobile={mobile} />}

      {/* MAIN DASHBOARD */}
      {!loading && total > 0 && (
        <div style={{ maxWidth: mobile ? "100%" : "1100px", margin: "0 auto", padding: mobile ? "24px 20px 100px" : "40px 48px 60px" }}>

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              {mobile && (
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>
                  {greeting}, {displayName.toUpperCase()}
                </div>
              )}
              <h1 style={{ fontSize: mobile ? "28px" : "36px", fontWeight: "800", color: C.pink, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                {mobile ? "Your Health Today" : `Hello, ${displayName}.`}
              </h1>
              <p style={{ fontSize: "15px", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                {mobile ? "Clinical clarity tailored for your wellness journey." : "Here's your health history and analysis overview."}
              </p>
            </div>
            {!mobile && (
              <Link to="/symptom-check" style={{ textDecoration: "none" }}>
                <button style={{
                  background: C.mauve, color: C.white,
                  border: "none", borderRadius: "8px",
                  padding: "12px 24px", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  ⊕ Start New Analysis
                </button>
              </Link>
            )}
          </div>

          {/* PREMIUM BADGE — mobile */}
          {mobile && (
            <div style={{
              background: C.goldLight, border: `1px solid ${C.goldBorder}`,
              borderRadius: "10px", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "12px",
              marginBottom: "20px",
            }}>
              <span style={{ fontSize: "20px" }}>🏆</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#92720A", fontFamily: "system-ui, sans-serif" }}>
                {total} analyse{total !== 1 ? "s" : ""} completed — keep tracking!
              </span>
            </div>
          )}

          {/* STAT CARDS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "28px",
          }}>
            {!mobile ? (
              <>
                {[
                  { label: "TOTAL ANALYSES", value: String(total), sub: "Records", icon: null },
                  { label: "REFER (LAST ACTION)", value: lastRiskLabel, icon: "⊕" },
                  { label: "CONDITION FLAGGED", value: lastCondition, icon: "⚠" },
                  { label: "MEMBER SINCE", value: memberSince, sub: "Active Member", icon: null },
                ].map((card) => (
                  <div key={card.label} style={{
                    background: C.white, border: `1px solid ${C.border}`,
                    borderRadius: "12px", padding: "20px 24px",
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px", fontFamily: "system-ui, sans-serif" }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: "6px" }}>
                      {card.icon && <span style={{ fontSize: "18px" }}>{card.icon}</span>}
                      {card.value}
                    </div>
                    {card.sub && <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px", fontFamily: "system-ui, sans-serif" }}>{card.sub}</div>}
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ background: C.white, border: `1.5px solid ${C.mauve}`, borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "11px", color: C.muted, fontFamily: "system-ui, sans-serif", marginBottom: "6px" }}>Latest Analysis</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "4px" }}>
                    {formatDate(latest?.created_at)}
                  </div>
                  <div style={{ fontSize: "12px", color: C.pink, fontFamily: "system-ui, sans-serif" }}>
                    {lastCondition !== "—" ? lastCondition : "No condition flagged"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ background: C.white, border: `1.5px solid ${C.gold}`, borderRadius: "12px", padding: "14px 16px", flex: 1 }}>
                    <div style={{ fontSize: "11px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Total Analyses</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>{total}</div>
                  </div>
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px", flex: 1 }}>
                    <div style={{ fontSize: "11px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Risk Status</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>{lastRiskLabel}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* MAIN CONTENT */}
          <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "24px", alignItems: "flex-start" }}>

            {/* LEFT COLUMN */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* CHART */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, margin: "0 0 4px", fontFamily: "Georgia, serif" }}>
                      {mobile ? "WELLNESS TREND" : "Symptom Severity Trend"}
                    </h3>
                    {!mobile && <p style={{ fontSize: "13px", color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Self-reported 0–10 scale over last {Math.min(total, 7)} analyses</p>}
                  </div>
                  {!mobile ? (
                    <span style={{ background: C.bg, fontSize: "12px", color: C.body, padding: "4px 12px", borderRadius: "100px", fontFamily: "system-ui, sans-serif", border: `1px solid ${C.border}` }}>Pain Data</span>
                  ) : (
                    <Link to="/symptom-check" style={{ textDecoration: "none" }}>
                      <span style={{ fontSize: "13px", color: C.pink, fontFamily: "system-ui, sans-serif", fontWeight: "600", cursor: "pointer" }}>New Check</span>
                    </Link>
                  )}
                </div>
                <div style={{ marginTop: "16px" }}>
                  {mobile
                    ? <BarChart submissions={submissions} />
                    : <LineChart submissions={submissions} mobile={false} />
                  }
                </div>
              </div>

              {/* LIFETIME ACCESS — desktop */}
              {!mobile && (
                <div style={{
                  background: C.goldLight, border: `1px solid ${C.goldBorder}`,
                  borderRadius: "16px", padding: "20px 24px",
                  display: "flex", alignItems: "center", gap: "20px",
                }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                    ★
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "4px" }}>Lifetime Legacy Access</div>
                    <div style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif" }}>You have free lifetime access to SisterCircle+ as a founding member.</div>
                  </div>
                  <div style={{ background: C.charcoal, color: C.white, fontSize: "11px", fontWeight: "700", padding: "8px 14px", borderRadius: "6px", fontFamily: "system-ui, sans-serif", textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                    FREE TIER<br />BADGE
                  </div>
                </div>
              )}

              {/* RECENT REPORTS — mobile */}
              {mobile && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: C.charcoal, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px", fontFamily: "system-ui, sans-serif" }}>
                    RECENT REPORTS
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {submissions.slice(0, 3).map((s, i) => {
                      const riskLabel = riskTierToLabel(s.risk_tier);
                      const condName = getFirstConditionName(s);
                      return (
                        <div key={s.id} style={{
                          background: C.white, borderRadius: "10px", padding: "14px 16px",
                          display: "flex", alignItems: "center", gap: "12px",
                          border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColorForTier(s.risk_tier), flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
                              {condName !== "—" ? condName : "Symptom Analysis"}
                            </div>
                            <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>{formatDate(s.created_at)}</div>
                          </div>
                          <RiskBadge level={riskLabel} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN — HEALTH HISTORY desktop */}
            {!mobile && (
              <div style={{ flex: "0 0 320px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, margin: "0 0 20px", fontFamily: "Georgia, serif" }}>
                  Health History
                </h3>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {submissions.slice(0, 5).map((s, i, arr) => {
                    const riskLabel = riskTierToLabel(s.risk_tier);
                    const condName = getFirstConditionName(s);
                    const desc = s.ai_result?.conditions?.[0]?.description ?? "";
                    const dot = dotColorForTier(s.risk_tier);
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={s.id} style={{
                        display: "flex", gap: "14px",
                        paddingBottom: isLast ? "0" : "20px",
                        borderLeft: isLast ? "none" : `2px solid ${C.border}`,
                        marginLeft: "5px", paddingLeft: "16px",
                        position: "relative",
                      }}>
                        <div style={{
                          position: "absolute", left: "-6px", top: "0",
                          width: "12px", height: "12px", borderRadius: "50%",
                          background: dot,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>
                            {formatDate(s.created_at)}
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>
                              {condName !== "—" ? condName : "Symptom Analysis"}
                            </div>
                            <RiskBadge level={riskLabel} />
                          </div>
                          {desc && (
                            <div style={{ fontSize: "13px", color: C.body, lineHeight: "1.5", fontFamily: "system-ui, sans-serif", marginBottom: "8px" }}>
                              {desc.length > 100 ? desc.slice(0, 100) + "…" : desc}
                            </div>
                          )}
                          <span style={{ fontSize: "13px", color: C.pink, fontFamily: "system-ui, sans-serif", cursor: "pointer", fontWeight: "500" }}>
                            View Full Report ›
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER — desktop */}
      {!mobile && (
        <footer style={{ background: C.footerBg, padding: "40px 48px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
            <div>
              <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", marginBottom: "8px", display: "block", textDecoration: "none" }}>SisterCircle+</Link>
              <div style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Medical Clarity through Clinical Warmth.</div>
            </div>
            {[
              { label: "Explore", links: ["Dashboard", "Resources", "Community"] },
              { label: "Legal",   links: ["Privacy Policy", "Terms of Service", "Disclaimer"] },
              { label: "Support", links: ["Help Center", "Contact Us"] },
            ].map(col => (
              <div key={col.label} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>{col.label}</span>
                {col.links.map(l => (
                  <span key={l} style={{ fontSize: "13px", color: C.muted, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
                ))}
              </div>
            ))}
          </div>
          <div style={{ maxWidth: "1100px", margin: "24px auto 0", paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>© 2026 SisterCircle+.</span>
          </div>
        </footer>
      )}

      {/* MOBILE BOTTOM NAV */}
      {mobile && (
        <>
          <div style={{ position: "fixed", bottom: "64px", left: "20px", right: "20px" }}>
            <Link to="/symptom-check" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", background: C.progressFill, color: C.white,
                border: "none", borderRadius: "100px",
                padding: "16px", fontSize: "16px", fontWeight: "600",
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                + New Analysis
              </button>
            </Link>
          </div>
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: C.white, borderTop: `1px solid ${C.border}`,
            padding: "10px 0 6px",
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          }}>
            {[
              { icon: "⊞", label: "Home",    href: "/" },
              { icon: "🩺", label: "Triage",  href: "/symptom-check" },
              { icon: "💬", label: "Support", href: "#" },
              { icon: "👤", label: "Account", href: "/signup" },
            ].map((item, i) => (
              <Link key={item.label} to={item.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer" }}>
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  <span style={{ fontSize: "10px", color: i === 0 ? C.pink : C.muted, fontFamily: "system-ui, sans-serif", fontWeight: i === 0 ? "600" : "400" }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
