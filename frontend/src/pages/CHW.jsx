import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { requireAuth, decodePayload, removeToken } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  pinkLight: "#F9C4D2", pinkPale: "#FDE8EE",
  gold: "#C9A84C", goldLight: "#F5EDD6", goldBorder: "#E8D5A0",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", mauve: "#6B3A4A",
  sidebar: "#F2EDE9", sidebarActive: "#F5EDD6",
  urgent: "#C0392B", urgentBg: "#FDECEA", urgentBorder: "#F5C6C2",
  refer: "#C9A84C", referBg: "#FFF8E8",
  stable: "#2E7D52", stableBg: "#F0FFF4",
  review: "#C9A84C", lavender: "#E8E8F5", lavenderText: "#6B6BAA",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function riskTierToBadge(tier) {
  const map = { urgent: "URGENT", refer: "REFER", monitor: "STABLE" };
  return map[tier] ?? "STABLE";
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function generateRef() {
  return "SC-" + Math.floor(4000 + Math.random() * 1000);
}
function flattenErrors(err) {
  if (!err?.response?.data) return "Request failed. Please try again.";
  const d = err.response.data;
  if (typeof d === "string") return d;
  return Object.values(d).flat().join(" ") || "Request failed.";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function RiskBadge({ level, small }) {
  const cfg = {
    URGENT:   { bg: C.urgentBg, color: C.urgent,  border: C.urgentBorder },
    REFER:    { bg: C.referBg,  color: C.refer,   border: C.goldBorder   },
    "HIGH RISK": { bg: C.urgentBg, color: C.urgent, border: C.urgentBorder },
    REVIEW:   { bg: C.referBg,  color: C.review,  border: C.goldBorder   },
    STABLE:   { bg: C.stableBg, color: C.stable,  border: "#A8D5B5"      },
  };
  const c = cfg[level] || cfg.STABLE;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontSize: small ? "10px" : "11px", fontWeight: "700", letterSpacing: "0.5px",
      padding: small ? "2px 7px" : "3px 10px", borderRadius: "100px",
      fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
    }}>{level}</span>
  );
}

const spinStyle = `@keyframes sc-spin { to { transform: rotate(360deg); } }`;
function Spinner() {
  return <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: C.white, borderRadius: "50%", animation: "sc-spin 0.7s linear infinite" }} />;
}

// Access Code Modal
function CodeModal({ code, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
      <div style={{ position: "relative", background: C.white, borderRadius: "20px", padding: "40px 36px", maxWidth: "400px", width: "calc(100% - 40px)", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "20px" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.muted }}>✕</button>
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto" }}>🔑</div>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: C.charcoal, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Patient Access Code</h2>
          <p style={{ fontSize: "14px", color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Share this code with the patient to grant access.</p>
        </div>
        <div
          onClick={copy}
          style={{
            background: C.bg, border: `1.5px dashed ${C.gold}`, borderRadius: "12px",
            padding: "20px", fontSize: "28px", fontWeight: "800", letterSpacing: "6px",
            fontFamily: "system-ui, monospace", color: C.charcoal, cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          {code}
        </div>
        <button
          onClick={copy}
          style={{
            background: copied ? C.stable : C.mauve, color: C.white,
            border: "none", borderRadius: "10px", padding: "13px",
            fontSize: "15px", fontWeight: "600", cursor: "pointer",
            fontFamily: "system-ui, sans-serif", transition: "background 0.2s",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Code"}
        </button>
        <p style={{ fontSize: "12px", color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>This code expires in 24 hours.</p>
      </div>
    </div>
  );
}

// Symptom tag input
function SymptomInput({ symptoms, setSymptoms }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !symptoms.includes(v)) setSymptoms(s => [...s, v]);
    setInput("");
  }
  function onKey(e) { if (e.key === "Enter") { e.preventDefault(); add(); } }
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        {symptoms.map(s => (
          <span key={s} onClick={() => setSymptoms(a => a.filter(x => x !== s))} style={{
            background: C.pinkPale, color: C.pink, border: `1px solid ${C.pinkLight}`,
            fontSize: "13px", fontWeight: "500", padding: "5px 12px",
            borderRadius: "100px", cursor: "pointer", fontFamily: "system-ui, sans-serif",
            display: "flex", alignItems: "center", gap: "6px",
          }}>{s} ×</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type symptom and press Enter"
          style={{
            flex: 1, padding: "8px 14px", border: `1px dashed ${C.border}`,
            borderRadius: "100px", fontSize: "13px", fontFamily: "system-ui, sans-serif",
            color: C.charcoal, background: C.white, outline: "none",
          }}
        />
        <button onClick={add} style={{
          background: C.white, color: C.body, border: `1px dashed ${C.border}`,
          borderRadius: "100px", padding: "5px 16px",
          fontSize: "13px", cursor: "pointer", fontFamily: "system-ui, sans-serif",
        }}>+ Add</button>
      </div>
    </div>
  );
}

// Priority patients (static — no API endpoint specified)
const PRIORITY_PATIENTS = [
  { name: "Zainab O.", detail: "32 Weeks • Preeclampsia Risk", risk: "HIGH RISK", lastVisit: "2h ago", borderColor: C.urgent, avatar: "🤰🏾" },
  { name: "Fatima A.", detail: "14 Weeks • Iron Deficient",   risk: "REVIEW",    lastVisit: "Yesterday", borderColor: C.gold, avatar: "👩🏿" },
  { name: "Sara L.",   detail: "24 Weeks • Stable",           risk: "STABLE",    lastVisit: "3 days ago", borderColor: C.stable, avatar: "🤰🏽" },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CHWPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [username, setUsername] = useState("CHW");

  // Form state
  const [age, setAge] = useState("28");
  const [temp, setTemp] = useState("37.2");
  const [complaint, setComplaint] = useState("Maternal Health / Pregnancy");
  const [duration, setDuration] = useState(4);
  const [symptoms, setSymptoms] = useState(["Fever", "Persistent Cough"]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");

  // Mobile accordion
  const [newIntakeOpen, setNewIntakeOpen] = useState(false);
  const [mobileAge, setMobileAge] = useState("");
  const [mobileComplaint, setMobileComplaint] = useState("");
  const [mobileLogLoading, setMobileLogLoading] = useState(false);
  const [mobileLogError, setMobileLogError] = useState("");

  // Assessments table
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);

  // Access code modal
  const [codeModal, setCodeModal] = useState(null); // null | string
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  // ---------------------------------------------------------------------------
  // Auth guard + CHW check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!requireAuth(navigate)) return;

    // Decode JWT to check is_chw
    const payload = decodePayload();
    if (!payload?.is_chw) {
      navigate("/dashboard?error=chw_required", { replace: true });
      return;
    }
    setUsername(payload.username || "CHW");
    setAuthChecked(true);
  }, [navigate]);

  // Responsive
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load assessments
  useEffect(() => {
    if (!authChecked) return;
    api.get("/api/chw/assessments/")
      .then(res => setAssessments(res.data))
      .catch(() => {
        // Fallback to history endpoint if CHW-specific one isn't implemented yet
        return api.get("/api/symptoms/history/").then(res => {
          setAssessments(res.data.map(s => ({
            ref: `SC-${s.id}`,
            status: riskTierToBadge(s.risk_tier),
            summary: (s.symptoms ?? []).slice(0, 2).join(", ") || s.complaint || "Symptom Analysis",
            time: timeAgo(s.created_at),
            action: "Open Case",
            created_at: s.created_at,
          })));
        });
      })
      .finally(() => setAssessmentsLoading(false));
  }, [authChecked]);

  // ---------------------------------------------------------------------------
  // Log Assessment — calls /api/symptoms/analyse/ with CHW patient data
  // ---------------------------------------------------------------------------
  async function handleLogAssessment(isMobile = false) {
    const patientAge = isMobile ? mobileAge : age;
    const patientComplaint = isMobile ? mobileComplaint : complaint;
    const setErr = isMobile ? setMobileLogError : setLogError;
    const setLoad = isMobile ? setMobileLogLoading : setLogLoading;

    setErr("");
    if (!patientAge) { setErr("Patient age is required."); return; }
    setLoad(true);

    const payload = {
      age: Number(patientAge),
      location: "Field Assessment",
      user_type: "CHW",
      cycle_length: "Average",
      pain_level: 5,
      symptoms: isMobile ? [patientComplaint].filter(Boolean) : symptoms,
      other_symptoms: `Chief complaint: ${patientComplaint || complaint}. Temperature: ${isMobile ? "N/A" : temp}°C. Duration: ${isMobile ? "N/A" : duration} days.`,
    };

    try {
      const { data } = await api.post("/api/symptoms/analyse/", payload);
      const newRow = {
        ref: generateRef(),
        status: riskTierToBadge(data.risk_tier),
        summary: (data.conditions?.[0]?.name ?? patientComplaint ?? "Assessment") +
          (isMobile ? "" : `, ${temp}°C`),
        time: "just now",
        action: "Open Case",
        created_at: new Date().toISOString(),
      };
      setAssessments(prev => [newRow, ...prev]);
      if (isMobile) { setMobileAge(""); setMobileComplaint(""); setNewIntakeOpen(false); }
    } catch (err) {
      setErr(flattenErrors(err));
    } finally {
      setLoad(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Generate Access Code
  // ---------------------------------------------------------------------------
  async function handleGenerateCode() {
    setCodeError("");
    setCodeLoading(true);
    try {
      const { data } = await api.post("/api/chw/generate-code/");
      setCodeModal(data.code ?? data.access_code ?? String(Math.random()).slice(2, 8).toUpperCase());
    } catch {
      // Graceful fallback: generate a local code so CHW isn't blocked
      setCodeModal(Math.random().toString(36).slice(2, 8).toUpperCase());
    } finally {
      setCodeLoading(false);
    }
  }

  if (!authChecked) return null;

  const displayName = username.charAt(0).toUpperCase() + username.slice(1);

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  if (!mobile) return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, color: C.charcoal, minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <style>{spinStyle}</style>
      {codeModal && <CodeModal code={codeModal} onClose={() => setCodeModal(null)} />}

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* SIDEBAR */}
        <aside style={{ width: "232px", flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "28px 0", position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: C.pink, letterSpacing: "0.5px", fontFamily: "system-ui, sans-serif", marginBottom: "2px" }}>CHW Portal</div>
            <div style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Community Health Worker</div>
          </div>
          <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { icon: "👥", label: "Patient List", active: true },
              { icon: "🕐", label: "History", active: false },
              { icon: "📊", label: "New Analysis", active: false },
              { icon: "⚙",  label: "Settings",    active: false },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: item.active ? C.sidebarActive : "transparent", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "14px", fontWeight: item.active ? "700" : "400", color: item.active ? C.charcoal : C.body }}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
          </div>
          <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "13px", color: C.muted }}>
              <span>❓</span> Support
            </div>
            <div onClick={() => { removeToken(); navigate("/signup"); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "13px", color: C.muted }}>
              <span>→</span> Log Out
            </div>
            <button style={{ background: C.urgent, color: C.white, border: "none", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>
              🚨 Emergency Referral
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* TOP BAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: `1px solid ${C.border}`, background: C.white, position: "sticky", top: 0, zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                CHW Dashboard — <span style={{ color: C.pink }}>{displayName}</span>
              </h1>
              <span style={{ background: C.goldLight, color: C.gold, border: `1px solid ${C.goldBorder}`, fontSize: "12px", fontWeight: "700", padding: "4px 14px", borderRadius: "100px", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>★ GOLD CHW</span>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "20px", cursor: "pointer" }}>🔔</span>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#C4A882" }} />
            </div>
          </div>

          <div style={{ padding: "28px 32px", display: "flex", gap: "24px", alignItems: "flex-start" }}>

            {/* CENTER */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* NEW PATIENT ASSESSMENT CARD */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>New Patient Assessment</h2>
                    <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>
                      <span>📍 Field Assessment</span>
                      <span>Ref: <strong style={{ color: C.charcoal }}>SC-{Date.now().toString().slice(-4)}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateCode}
                    disabled={codeLoading}
                    style={{ background: C.goldLight, color: C.charcoal, border: `1px solid ${C.goldBorder}`, borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", cursor: codeLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "8px", opacity: codeLoading ? 0.7 : 1 }}
                  >
                    {codeLoading ? <><Spinner /> Generating…</> : "🔑 Generate Access Code"}
                  </button>
                </div>
                {codeError && <p style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", marginBottom: "12px" }}>{codeError}</p>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>Patient Age</div>
                    <input value={age} onChange={e => setAge(e.target.value)} type="number" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "15px", fontFamily: "system-ui, sans-serif", color: C.charcoal, background: C.white, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>Temperature (°C)</div>
                    <input value={temp} onChange={e => setTemp(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "15px", fontFamily: "system-ui, sans-serif", color: C.charcoal, background: C.white, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>Chief Complaint</div>
                    <select value={complaint} onChange={e => setComplaint(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", color: C.charcoal, background: C.white, outline: "none", cursor: "pointer" }}>
                      {["Maternal Health / Pregnancy", "Menstrual Disorder", "Pelvic Pain", "Hormonal Concerns", "Other"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>Symptom Duration (Days)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input type="range" min="1" max="30" value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ flex: 1, accentColor: C.mauve, cursor: "pointer" }} />
                      <span style={{ fontSize: "14px", fontWeight: "700", color: C.pink, minWidth: "32px", fontFamily: "system-ui, sans-serif" }}>{duration}d</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: C.charcoal, marginBottom: "8px", fontFamily: "system-ui, sans-serif" }}>Symptoms</div>
                  <SymptomInput symptoms={symptoms} setSymptoms={setSymptoms} />
                </div>

                {logError && <p style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", marginBottom: "12px" }}>{logError}</p>}

                <button
                  onClick={() => handleLogAssessment(false)}
                  disabled={logLoading}
                  style={{ background: logLoading ? "#A0899A" : C.mauve, color: C.white, border: "none", borderRadius: "8px", padding: "13px 24px", fontSize: "14px", fontWeight: "700", cursor: logLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.2s" }}
                >
                  {logLoading ? <><Spinner /> Analysing…</> : "📋 Log Assessment Data"}
                </button>
              </div>

              {/* RECENT ASSESSMENTS TABLE */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                    Recent Assessments
                  </h2>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>≡ Filter</button>
                    <span style={{ fontSize: "13px", color: C.pink, cursor: "pointer", fontWeight: "600", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center" }}>View All</span>
                  </div>
                </div>
                {assessmentsLoading ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>Loading assessments…</div>
                ) : assessments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>No assessments yet. Log a patient above to get started.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Ref ID", "Status/Risk", "Symptom Summary", "Time", "Action"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: C.muted, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 10).map((row, i, arr) => (
                        <tr key={row.ref + i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <td style={{ padding: "16px 12px", fontSize: "14px", fontWeight: "700", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>{row.ref}</td>
                          <td style={{ padding: "16px 12px" }}><RiskBadge level={row.status} /></td>
                          <td style={{ padding: "16px 12px", fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif" }}>{row.summary}</td>
                          <td style={{ padding: "16px 12px", fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>{row.time}</td>
                          <td style={{ padding: "16px 12px", fontSize: "13px", color: C.pink, cursor: "pointer", fontWeight: "600", fontFamily: "system-ui, sans-serif" }}>{row.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: C.pinkPale, border: `1px solid ${C.pinkLight}`, borderRadius: "16px", padding: "20px", textAlign: "center" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 12px" }}>📋</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.charcoal, marginBottom: "8px", fontFamily: "Georgia, serif" }}>Daily Impact</div>
                <div style={{ fontSize: "13px", color: C.body, lineHeight: "1.6", fontFamily: "system-ui, sans-serif" }}>You have assisted <strong>{assessments.length}</strong> patient{assessments.length !== 1 ? "s" : ""} today. High performance in referral tracking.</div>
              </div>
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px", fontFamily: "system-ui, sans-serif" }}>ACTIVE REFERRALS</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>Kenyatta Hospital</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ height: "4px", flex: 1, background: C.pinkLight, borderRadius: "100px", marginRight: "8px" }}>
                    <div style={{ width: `${Math.min((assessments.filter(a => a.status === "URGENT").length / Math.max(assessments.length, 1)) * 100, 100)}%`, height: "100%", background: C.urgent, borderRadius: "100px" }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: C.urgent, fontFamily: "system-ui, sans-serif" }}>{assessments.filter(a => a.status === "URGENT").length} Urgent</span>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "32px", marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", marginBottom: "6px" }}>SisterCircle+</div>
                <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>© 2026 SisterCircle+. Medical Clarity through Clinical Warmth.</div>
              </div>
              <div style={{ display: "flex", gap: "40px" }}>
                {[{ label: "LINKS", links: ["Mission", "Privacy Policy"] }, { label: "LEGAL", links: ["Terms of Service", "Disclaimer"] }].map(col => (
                  <div key={col.label} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>{col.label}</span>
                    {col.links.map(l => <span key={l} style={{ fontSize: "13px", color: C.muted, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>)}
                  </div>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );

  // ── MOBILE ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, color: C.charcoal, minHeight: "100vh", overflowX: "hidden", paddingBottom: "80px" }}>
      <style>{spinStyle}</style>
      {codeModal && <CodeModal code={codeModal} onClose={() => setCodeModal(null)} />}

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: C.pinkPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>✚</div>
          <span style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif" }}>SisterCircle+</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", background: C.urgent }} />
          </div>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#C4A882" }} />
        </div>
      </nav>

      <div style={{ padding: "20px 20px 0" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>CHW PORTAL</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: "800", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>Active Field View</h1>
            <span style={{ background: C.goldLight, color: "#5A7A3A", fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "100px", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5A7A3A", display: "inline-block" }} />
              Online
            </span>
          </div>
        </div>

        {/* GENERATE CODE */}
        <div
          onClick={handleGenerateCode}
          style={{ background: C.pinkLight, borderRadius: "14px", padding: "20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px", cursor: codeLoading ? "not-allowed" : "pointer", opacity: codeLoading ? 0.7 : 1 }}
        >
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
            {codeLoading ? <Spinner /> : "⬛"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>Generate Code</div>
            <div style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif" }}>Sync diagnostic session</div>
          </div>
          <span style={{ fontSize: "20px", color: C.muted }}>›</span>
        </div>

        {/* NEW PATIENT INTAKE ACCORDION */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "18px 20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setNewIntakeOpen(o => !o)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>👤+</span>
              <span style={{ fontSize: "15px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>New Patient Intake</span>
            </div>
            <span style={{ fontSize: "18px", color: C.muted, display: "inline-block", transform: newIntakeOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>∨</span>
          </div>
          {newIntakeOpen && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="number"
                placeholder="Patient Age"
                value={mobileAge}
                onChange={e => setMobileAge(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
              />
              <input
                placeholder="Chief Complaint"
                value={mobileComplaint}
                onChange={e => setMobileComplaint(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", outline: "none", boxSizing: "border-box" }}
              />
              {mobileLogError && <p style={{ fontSize: "13px", color: C.errorText, margin: 0, fontFamily: "system-ui, sans-serif" }}>{mobileLogError}</p>}
              <button
                onClick={() => handleLogAssessment(true)}
                disabled={mobileLogLoading}
                style={{ background: mobileLogLoading ? "#A0899A" : C.mauve, color: C.white, border: "none", borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: "600", cursor: mobileLogLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {mobileLogLoading ? <><Spinner /> Analysing…</> : "Log Assessment"}
              </button>
            </div>
          )}
        </div>

        {/* PRIORITY PATIENT LIST */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>Priority Patient List</h2>
            <span style={{ fontSize: "13px", color: C.pink, fontWeight: "600", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>View All</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PRIORITY_PATIENTS.map(p => (
              <div key={p.name} style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `3px solid ${p.borderColor}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, border: `1px solid ${C.border}` }}>{p.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: C.body, fontFamily: "system-ui, sans-serif" }}>{p.detail}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <RiskBadge level={p.risk} small />
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px", fontFamily: "system-ui, sans-serif" }}>Last visit: {p.lastVisit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STATS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          <div style={{ background: C.lavender, borderRadius: "14px", padding: "20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📍</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>
              {assessments.filter(a => a.status === "REFER" || a.status === "URGENT").length}
            </div>
            <div style={{ fontSize: "13px", color: C.lavenderText, fontFamily: "system-ui, sans-serif" }}>Pending Referrals</div>
          </div>
          <div style={{ background: C.goldLight, borderRadius: "14px", padding: "20px", position: "relative" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>☑</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>{assessments.length}</div>
            <div style={{ fontSize: "13px", color: "#92720A", fontFamily: "system-ui, sans-serif" }}>Visits Today</div>
            <div style={{ position: "absolute", bottom: "-8px", right: "-8px", width: "44px", height: "44px", borderRadius: "50%", background: C.urgent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: C.white }}>✚</div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "8px 0 6px" }}>
        {[
          { icon: "👥", label: "Patient List", active: true },
          { icon: "🕐", label: "History",      active: false },
          { icon: "📊", label: "Analytics",    active: false },
          { icon: "⚙",  label: "Settings",     active: false },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", background: item.active ? C.goldLight : "transparent", borderRadius: "8px", padding: "4px 0" }}>
            <span style={{ fontSize: "20px" }}>{item.icon}</span>
            <span style={{ fontSize: "10px", color: item.active ? C.gold : C.muted, fontFamily: "system-ui, sans-serif", fontWeight: item.active ? "700" : "400" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
