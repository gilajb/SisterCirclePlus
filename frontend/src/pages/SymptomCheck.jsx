import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/axios";
import { requireAuth } from "@/lib/auth";

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
  inputBorder: "#D8CCC8",
  footerBg: "#E8E4E0",
  mauve: "#6B3A4A",
  progressFill: "#8B5A6A",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#B91C1C",
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Basics",   title: "Tell us about yourself",        sub: '"We\'re listening. Tell us more about your experience."' },
  { label: "Cycle",    title: "How's your cycle?",             sub: "Tell us about your last period to help us understand your baseline." },
  { label: "Symptoms", title: "What are you experiencing?",    sub: "Be as specific as you can — every detail helps the analysis." },
  { label: "Review",   title: "Review your information",       sub: "Check everything before we run your analysis." },
];

const SYMPTOM_OPTIONS = [
  "Severe cramping", "Pelvic heaviness", "Lower back pain",
  "Fatigue / low energy", "Bloating", "Nausea",
  "Pain during intercourse", "Pain when urinating",
  "Irregular spotting", "Mood changes", "Headaches", "Breast tenderness",
];

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function Label({ text, required }) {
  return (
    <div style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, marginBottom: "8px", fontFamily: "system-ui, sans-serif" }}>
      {text}{required && <span style={{ color: C.pink }}> *</span>}
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text" }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "12px 16px",
        border: `1px solid ${C.inputBorder}`,
        borderRadius: "8px", fontSize: "15px",
        fontFamily: "system-ui, sans-serif",
        color: C.charcoal, background: C.white,
        outline: "none", boxSizing: "border-box",
        appearance: "none",
      }}
    />
  );
}

function RadioCard({ label, selected, onClick, mobile }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: mobile ? "14px 16px" : "16px 20px",
        border: `1.5px solid ${selected ? C.pink : C.inputBorder}`,
        borderRadius: "8px", cursor: "pointer",
        background: selected ? C.pinkPale : C.white,
        display: "flex", alignItems: "center", gap: "12px",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%",
        border: `2px solid ${selected ? C.pink : C.inputBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {selected && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: C.pink }} />}
      </div>
      <span style={{ fontSize: "15px", fontWeight: "500", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>{label}</span>
    </div>
  );
}

function SegmentBtn({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "12px 8px",
        border: `1.5px solid ${selected ? C.pink : C.inputBorder}`,
        borderRadius: "8px", cursor: "pointer",
        background: selected ? C.pinkPale : C.white,
        color: selected ? C.pink : C.charcoal,
        fontSize: "14px", fontWeight: selected ? "700" : "500",
        fontFamily: "system-ui, sans-serif",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function InfoBox({ text }) {
  return (
    <div style={{
      background: C.goldLight, border: `1px solid ${C.goldBorder}`,
      borderLeft: `3px solid ${C.gold}`,
      borderRadius: "8px", padding: "14px 16px",
      display: "flex", gap: "10px", alignItems: "flex-start",
    }}>
      <span style={{ color: C.gold, fontSize: "16px", flexShrink: 0 }}>ⓘ</span>
      <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#92720A", margin: 0, fontStyle: "italic", fontFamily: "system-ui, sans-serif" }}>
        {text}
      </p>
    </div>
  );
}

function PainSlider({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>No pain</span>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.pink, fontFamily: "system-ui, sans-serif" }}>{value}/10</span>
        <span style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Severe</span>
      </div>
      <input
        type="range" min="0" max="10" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.pink, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <span key={n} style={{ fontSize: "10px", color: n <= value ? C.pink : C.muted, fontFamily: "system-ui, sans-serif", fontWeight: n === value ? "700" : "400" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "14px 0", borderBottom: `1px solid ${C.border}`,
      gap: "16px",
    }}>
      <span style={{ fontSize: "14px", color: C.muted, fontFamily: "system-ui, sans-serif", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif", textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: C.errorBg, border: `1px solid ${C.errorBorder}`,
      borderRadius: "8px", padding: "12px 16px",
      display: "flex", alignItems: "flex-start", gap: "10px",
      marginTop: "16px",
    }}>
      <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>{message}</span>
    </div>
  );
}

const spinnerStyle = `@keyframes sc-spin { to { transform: rotate(360deg); } }`;

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: "16px", height: "16px",
      border: "2px solid rgba(255,255,255,0.35)",
      borderTopColor: C.white, borderRadius: "50%",
      animation: "sc-spin 0.7s linear infinite",
    }} />
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SymptomCheckPage() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    age: "", location: "", userType: "Patient",
    lastPeriod: "", cycleLength: "Average", cycleRegularity: "",
    bleedingVolume: "", bleedingDays: "",
    painLevel: 5, symptoms: [], otherSymptoms: "",
  });

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    setAuthChecked(requireAuth(navigate));
  }, [navigate]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleSymptom = (s) => set("symptoms",
    form.symptoms.includes(s)
      ? form.symptoms.filter(x => x !== s)
      : [...form.symptoms, s]
  );

  const progress = ((step - 1) / 3) * 100 + 25;
  const stepInfo = STEPS[step - 1];

  // ── Submit handler ──────────────────────────────────────────────────────
  async function handleAnalyse() {
    setSubmitError("");
    setLoading(true);

    const payload = {
      age: form.age ? Number(form.age) : null,
      location: form.location,
      user_type: form.userType,
      last_period: form.lastPeriod || null,
      cycle_length: form.cycleLength,
      cycle_regularity: form.cycleRegularity,
      bleeding_volume: form.bleedingVolume,
      bleeding_days: form.bleedingDays,
      pain_level: form.painLevel,
      symptoms: form.symptoms,
      other_symptoms: form.otherSymptoms,
    };

    try {
      const { data } = await api.post("/api/symptoms/analyse/", payload);
      sessionStorage.setItem("sistercircle_result", JSON.stringify(data));
      navigate("/results");
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === "string") {
        setSubmitError(errData);
      } else if (errData && typeof errData === "object") {
        const messages = Object.values(errData).flat();
        setSubmitError(messages.length ? messages.join(" ") : "Analysis failed. Please try again.");
      } else {
        setSubmitError("Analysis failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step < 4) {
      setSubmitError("");
      setStep(s => s + 1);
    } else {
      handleAnalyse();
    }
  }

  if (!authChecked) return null;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, color: C.charcoal, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{spinnerStyle}</style>

      {/* NAV */}
      {!mobile ? (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 48px", background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <Link to="/" style={{ fontSize: "20px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <Link to="/dashboard" style={{ fontSize: "15px", cursor: "pointer", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", fontWeight: "400" }}>Dashboard</Link>
            <Link to="/symptom-check" style={{ fontSize: "15px", cursor: "pointer", color: C.charcoal, fontFamily: "system-ui, sans-serif", textDecoration: "none", borderBottom: `2px solid ${C.pink}`, paddingBottom: "2px", fontWeight: "600" }}>Symptom Check</Link>
            <span style={{ fontSize: "15px", cursor: "pointer", color: C.charcoal, fontFamily: "system-ui, sans-serif", fontWeight: "400" }}>Resources</span>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#C4A882" }} />
          </div>
        </nav>
      ) : (
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: C.white,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <span onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/")} style={{ fontSize: "20px", cursor: "pointer", color: C.charcoal }}>✕</span>
          <span style={{ fontSize: "17px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif" }}>SisterCircle+</span>
          <span style={{ fontSize: "18px" }}>📱</span>
        </nav>
      )}

      {/* PAGE HEADER — desktop only */}
      {!mobile && (
        <div style={{ textAlign: "center", padding: "40px 48px 20px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "800", color: C.mauve, margin: "0 0 12px", fontFamily: "Georgia, serif" }}>
            Symptom Assessment
          </h1>
          <p style={{ fontSize: "16px", color: C.muted, fontStyle: "italic", margin: 0, fontFamily: "system-ui, sans-serif" }}>
            "We're listening. Tell us more about your experience."
          </p>
        </div>
      )}

      {/* FORM CONTAINER */}
      <div style={{ maxWidth: mobile ? "100%" : "720px", margin: "0 auto", padding: mobile ? "20px 20px 100px" : "32px 48px 60px" }}>

        {/* PROGRESS */}
        <div style={{ marginBottom: mobile ? "24px" : "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: C.progressFill, letterSpacing: "0.5px", fontFamily: "system-ui, sans-serif" }}>
              STEP {step} OF 4{mobile && ` — ${stepInfo.label.toUpperCase()}`}
            </span>
            <span style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>
              {progress}% Complete
            </span>
          </div>
          <div style={{ height: "5px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: C.progressFill, borderRadius: "100px", transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* STEP HEADING */}
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: mobile ? "26px" : "22px", fontWeight: "800", color: C.charcoal, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>
            {stepInfo.title}
          </h2>
          <p style={{ fontSize: "14px", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif", lineHeight: "1.6" }}>
            {stepInfo.sub}
          </p>
        </div>

        {/* FORM CARD */}
        <div style={{
          background: mobile ? "transparent" : C.white,
          borderRadius: mobile ? 0 : "16px",
          border: mobile ? "none" : `1px solid ${C.border}`,
          padding: mobile ? "0" : "36px",
        }}>

          {/* ── STEP 1: BASICS ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {!mobile ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <Label text="Age" required />
                      <Input placeholder="Enter age" value={form.age} onChange={v => set("age", v)} type="number" />
                    </div>
                    <div>
                      <Label text="Location (City, Country)" required />
                      <Input placeholder="e.g. Lagos, Nigeria" value={form.location} onChange={v => set("location", v)} />
                    </div>
                  </div>
                  <div>
                    <Label text="I am filling this form as a:" required />
                    <div style={{ display: "flex", gap: "16px" }}>
                      <RadioCard label="Patient" selected={form.userType === "Patient"} onClick={() => set("userType", "Patient")} mobile={false} />
                      <RadioCard label="Community Health Worker" selected={form.userType === "CHW"} onClick={() => set("userType", "CHW")} mobile={false} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label text="Last Period Start Date" required />
                    <Input placeholder="mm/dd/yyyy" value={form.lastPeriod} onChange={v => set("lastPeriod", v)} type="date" />
                  </div>
                  <div>
                    <Label text="Cycle Length (Typical)" required />
                    <div style={{ display: "flex", gap: "10px" }}>
                      {["Short", "Average", "Long"].map(opt => (
                        <SegmentBtn key={opt} label={opt} selected={form.cycleLength === opt} onClick={() => set("cycleLength", opt)} />
                      ))}
                    </div>
                  </div>
                  <InfoBox text='"Knowing your cycle helps us rule out common hormone shifts, Sister."' />
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: CYCLE DETAILS ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {mobile && (
                <div>
                  <Label text="Age" required />
                  <Input placeholder="Enter your age" value={form.age} onChange={v => set("age", v)} type="number" />
                </div>
              )}
              <div>
                <Label text="Last Period Start Date" required />
                <Input placeholder="mm/dd/yyyy" value={form.lastPeriod} onChange={v => set("lastPeriod", v)} type="date" />
              </div>
              <div>
                <Label text="Cycle Regularity" required />
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["Very Regular", "Mostly Regular", "Irregular", "Very Irregular"].map(opt => (
                    <SegmentBtn key={opt} label={opt} selected={form.cycleRegularity === opt} onClick={() => set("cycleRegularity", opt)} />
                  ))}
                </div>
              </div>
              <div>
                <Label text="Bleeding Volume" required />
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["Light", "Moderate", "Heavy", "Very Heavy"].map(opt => (
                    <SegmentBtn key={opt} label={opt} selected={form.bleedingVolume === opt} onClick={() => set("bleedingVolume", opt)} />
                  ))}
                </div>
              </div>
              <div>
                <Label text="How many days does your period last?" required />
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["1–3 days", "4–5 days", "6–7 days", "8+ days"].map(opt => (
                    <SegmentBtn key={opt} label={opt} selected={form.bleedingDays === opt} onClick={() => set("bleedingDays", opt)} />
                  ))}
                </div>
              </div>
              <InfoBox text='"Heavy bleeding that soaks through a pad in under an hour is a clinical signal worth noting, Sister."' />
            </div>
          )}

          {/* ── STEP 3: SYMPTOMS ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <Label text="Pain severity (0 = none, 10 = severe)" required />
                <PainSlider value={form.painLevel} onChange={v => set("painLevel", v)} />
              </div>
              <div>
                <Label text="Select all symptoms that apply" required />
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "10px" }}>
                  {SYMPTOM_OPTIONS.map(s => {
                    const selected = form.symptoms.includes(s);
                    return (
                      <div
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        style={{
                          padding: "10px 12px",
                          border: `1.5px solid ${selected ? C.pink : C.inputBorder}`,
                          borderRadius: "8px", cursor: "pointer",
                          background: selected ? C.pinkPale : C.white,
                          fontSize: "13px", fontWeight: selected ? "600" : "400",
                          color: selected ? C.pink : C.body,
                          fontFamily: "system-ui, sans-serif",
                          transition: "all 0.15s", textAlign: "center",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        }}
                      >
                        {selected && <span style={{ fontSize: "11px" }}>✓</span>}
                        {s}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label text="Anything else you'd like us to know?" />
                <textarea
                  placeholder="Describe any other symptoms, patterns, or concerns..."
                  value={form.otherSymptoms}
                  onChange={e => set("otherSymptoms", e.target.value)}
                  rows={4}
                  style={{
                    width: "100%", padding: "12px 16px",
                    border: `1px solid ${C.inputBorder}`,
                    borderRadius: "8px", fontSize: "14px",
                    fontFamily: "system-ui, sans-serif",
                    color: C.charcoal, background: C.white,
                    outline: "none", resize: "vertical",
                    boxSizing: "border-box", lineHeight: "1.6",
                  }}
                />
              </div>
              <InfoBox text='"The more you share, the more precise your analysis will be. There are no wrong answers here, Sister."' />
            </div>
          )}

          {/* ── STEP 4: REVIEW ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{
                background: C.pinkPale, borderRadius: "10px", padding: "16px 20px",
                fontSize: "14px", color: C.pink, fontFamily: "system-ui, sans-serif",
                display: "flex", gap: "8px", alignItems: "flex-start",
              }}>
                <span>ℹ</span>
                <span>Please review your information before submitting. You can go back to edit any section.</span>
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px", fontFamily: "system-ui, sans-serif" }}>About You</div>
                <ReviewRow label="Age" value={form.age} />
                <ReviewRow label="Location" value={form.location} />
                <ReviewRow label="User Type" value={form.userType} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px", fontFamily: "system-ui, sans-serif" }}>Cycle Details</div>
                <ReviewRow label="Last Period" value={form.lastPeriod} />
                <ReviewRow label="Cycle Length" value={form.cycleLength} />
                <ReviewRow label="Regularity" value={form.cycleRegularity} />
                <ReviewRow label="Bleeding Volume" value={form.bleedingVolume} />
                <ReviewRow label="Bleeding Duration" value={form.bleedingDays} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px", fontFamily: "system-ui, sans-serif" }}>Symptoms</div>
                <ReviewRow label="Pain Level" value={`${form.painLevel}/10`} />
                <ReviewRow label="Symptoms" value={form.symptoms.length > 0 ? form.symptoms.join(", ") : "None selected"} />
                {form.otherSymptoms && <ReviewRow label="Additional Notes" value={form.otherSymptoms} />}
              </div>
              <div style={{
                background: C.goldLight, border: `1px solid ${C.goldBorder}`,
                borderRadius: "10px", padding: "16px 20px",
                fontSize: "13px", color: "#92720A",
                fontStyle: "italic", fontFamily: "system-ui, sans-serif", lineHeight: "1.6",
              }}>
                By submitting, you confirm this information is accurate to the best of your knowledge. SisterCircle+ analysis is for informational purposes only and does not replace professional medical advice.
              </div>

              {/* Error shown only on step 4 below the disclaimer */}
              <ErrorBanner message={submitError} />
            </div>
          )}

          {/* NAVIGATION — desktop */}
          {!mobile && (
            <div style={{ display: "flex", justifyContent: step > 1 ? "space-between" : "flex-end", marginTop: "32px" }}>
              {step > 1 && (
                <button
                  onClick={() => { setSubmitError(""); setStep(s => s - 1); }}
                  disabled={loading}
                  style={{
                    background: "transparent", color: C.charcoal,
                    border: `1px solid ${C.border}`, borderRadius: "8px",
                    padding: "12px 28px", fontSize: "15px", fontWeight: "600",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, sans-serif",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={loading}
                style={{
                  background: loading ? "#A0899A" : C.progressFill,
                  color: C.white, border: "none", borderRadius: "8px",
                  padding: "12px 32px", fontSize: "15px", fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: "8px",
                  transition: "background 0.2s",
                }}
              >
                {loading ? (
                  <><Spinner /> Analysing…</>
                ) : step < 4 ? "Continue →" : "Analyse My Symptoms ✦"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER — desktop */}
      {!mobile && (
        <footer style={{ background: C.footerBg, padding: "40px 48px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", marginBottom: "8px", display: "block", textDecoration: "none" }}>SisterCircle+</Link>
              <div style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", maxWidth: "320px", lineHeight: "1.6" }}>
                © 2026 SisterCircle+. Medical Clarity through Clinical Warmth. Dedicated to reproductive health equity and empathetic diagnostic care.
              </div>
            </div>
            <div style={{ display: "flex", gap: "48px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>Company</span>
                {["Mission", "Privacy Policy"].map(l => (
                  <span key={l} style={{ fontSize: "13px", color: C.muted, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>Support</span>
                {["Terms of Service", "Disclaimer"].map(l => (
                  <span key={l} style={{ fontSize: "13px", color: C.muted, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* MOBILE BOTTOM BUTTON */}
      {mobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: C.white, borderTop: `1px solid ${C.border}`,
          padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          {/* Error banner sits above the button on mobile */}
          {step === 4 && submitError && <ErrorBanner message={submitError} />}
          <div style={{ display: "flex", gap: "12px" }}>
            {step > 1 && (
              <button
                onClick={() => { setSubmitError(""); setStep(s => s - 1); }}
                disabled={loading}
                style={{
                  width: "52px", height: "52px", flexShrink: 0,
                  background: C.white, color: C.charcoal,
                  border: `1px solid ${C.border}`, borderRadius: "10px",
                  fontSize: "20px", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >←</button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              style={{
                flex: 1,
                background: loading ? "#A0899A" : C.progressFill,
                color: C.white, border: "none", borderRadius: "10px",
                padding: "14px", fontSize: "15px", fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background 0.2s",
              }}
            >
              {loading ? (
                <><Spinner /> Analysing…</>
              ) : step < 4 ? "Next Step" : "Analyse My Symptoms ✦"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
