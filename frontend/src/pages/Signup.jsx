import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { setToken } from "@/lib/auth";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  pinkLight: "#F9C4D2", pinkPale: "#FDE8EE",
  gold: "#C9A84C", goldLight: "#F5EDD6", goldBorder: "#E8D5A0",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", inputBorder: "#D8CCC8", mauve: "#6B3A4A",
  progressFill: "#8B5A6A",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

const spinnerStyle = `@keyframes sc-spin { to { transform: rotate(360deg); } }`;

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

function PasswordInput({ label, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", padding: "13px 44px 13px 16px",
            border: `1px solid ${C.inputBorder}`, borderRadius: "10px",
            fontSize: "15px", fontFamily: "system-ui, sans-serif",
            color: C.charcoal, background: C.white,
            outline: "none", boxSizing: "border-box",
          }}
        />
        <span
          onClick={() => setShow(s => !s)}
          style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "16px", color: C.muted }}
        >
          {show ? "🙈" : "👁"}
        </span>
      </div>
    </div>
  );
}

function TextInput({ label, placeholder, type = "text", value, onChange, badge, hint, inputMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
          {label}
        </label>
        {badge && (
          <span style={{ fontSize: "11px", fontWeight: "700", color: C.gold, letterSpacing: "0.5px", fontFamily: "system-ui, sans-serif" }}>
            {badge}
          </span>
        )}
      </div>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "13px 16px",
          border: `1px solid ${C.inputBorder}`, borderRadius: "10px",
          fontSize: "15px", fontFamily: "system-ui, sans-serif",
          color: C.charcoal, background: C.white,
          outline: "none", boxSizing: "border-box",
        }}
      />
      {hint && (
        <p style={{ fontSize: "12px", color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif", lineHeight: "1.5", fontStyle: "italic" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function AgeInput({ label, placeholder, value, onChange, badge, hint }) {
  function handleChange(v) {
    if (v === "" || /^\d{0,3}$/.test(v)) onChange(v);
  }
  return (
    <TextInput
      label={label} placeholder={placeholder}
      type="text" inputMode="numeric"
      value={value} onChange={handleChange}
      badge={badge} hint={hint}
    />
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
        {message}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: C.white, borderRadius: "50%", animation: "sc-spin 0.7s linear infinite" }} />
  );
}

function isMinorAge(age) {
  return age !== "" && Number(age) < 16;
}

function GuardianEmailInput({ value, onChange }) {
  return (
    <TextInput
      label="Parent / Guardian Email"
      placeholder="parent@example.com"
      type="email"
      value={value}
      onChange={onChange}
      hint="Required for users under 16 — we'll email them to request their consent. This never delays your own access to triage support."
    />
  );
}

function TermsCheckbox({ checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: "3px", width: "16px", height: "16px", flexShrink: 0, cursor: "pointer" }}
      />
      <span style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
        I agree to the <Link to="/terms" target="_blank" style={{ color: C.mauve, fontWeight: "600" }}>Terms of Service</Link> and{" "}
        <Link to="/privacy" target="_blank" style={{ color: C.mauve, fontWeight: "600" }}>Privacy Policy</Link>.
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

export default function SignupPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("type") === "chw" ? "chw" : "signup");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleSignup() {
    setSignupError("");
    if (!name || !email || !password || !age) {
      setSignupError("Please fill in your name, email, age, and password.");
      return;
    }
    if (!termsAccepted) {
      setSignupError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (isMinorAge(age) && !guardianEmail) {
      setSignupError("A parent or guardian email is required for users under 16.");
      return;
    }
    const nameParts = name.trim().split(" ");
    const payload = {
      username: email.split("@")[0],
      email, password, password2: password,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      age: Number(age),
      terms_accepted: termsAccepted,
      ...(location && { location }),
      ...(isMinorAge(age) && { guardian_email: guardianEmail }),
    };
    setSignupLoading(true);
    try {
      const { data } = await api.post("/api/auth/register/", payload);
      setToken(data.access, data.refresh);
      navigate("/symptom-check");
    } catch (err) {
      setSignupError(flattenErrors(err));
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleLogin() {
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      const { data } = await api.post("/api/auth/login/", {
        username: loginEmail.includes("@") ? loginEmail.split("@")[0] : loginEmail,
        password: loginPassword,
      });
      setToken(data.access, data.refresh);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(flattenErrors(err));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCHWSignup() {
    setSignupError("");
    if (!name || !email || !password || !age) { setSignupError("Please fill in all fields."); return; }
    if (!termsAccepted) {
      setSignupError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (isMinorAge(age) && !guardianEmail) {
      setSignupError("A parent or guardian email is required for users under 16.");
      return;
    }
    const nameParts = name.trim().split(" ");
    const payload = {
      username: email.split("@")[0],
      email, password, password2: password,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      is_chw: true,
      age: Number(age),
      terms_accepted: termsAccepted,
      location,
      ...(isMinorAge(age) && { guardian_email: guardianEmail }),
    };
    setSignupLoading(true);
    try {
      const { data } = await api.post("/api/auth/register/", payload);
      setToken(data.access, data.refresh);
      navigate("/chw");
    } catch (err) {
      setSignupError(flattenErrors(err));
    } finally {
      setSignupLoading(false);
    }
  }

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "40px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      <style>{spinnerStyle}</style>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", fontWeight: "800", color: C.mauve, fontFamily: "Georgia, serif", marginBottom: "6px" }}>SisterCircle+</div>
        <div style={{ fontSize: "14px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Medical Clarity through Clinical Warmth.</div>
      </div>

      <div style={{ display: "flex", background: C.white, borderRadius: "100px", padding: "4px", border: `1px solid ${C.border}` }}>
        {["signup", "login"].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSignupError(""); setLoginError(""); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: "100px", border: "none", background: tab === t ? C.white : "transparent", color: tab === t ? C.mauve : C.muted, fontSize: "15px", fontWeight: tab === t ? "700" : "500", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            {t === "signup" ? "Sign Up" : "Log In"}
          </button>
        ))}
      </div>

      {tab === "chw" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#92720A", fontFamily: "Georgia, serif", marginBottom: "8px" }}>Institutional Portal Registration</div>
            <p style={{ fontSize: "14px", color: "#92720A", fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
              Register your school, NGO, or CHW program to manage youth access codes, reach your community, and access clinical diagnostic tools.
            </p>
          </div>
          <TextInput label="Contact Name" placeholder="e.g., Amina Yusuf" value={name} onChange={setName} />
          <TextInput label="Institution / School / NGO Name" placeholder="e.g., Kenyatta Girls' Secondary School" value={location} onChange={setLocation} />
          <TextInput label="Email Address" placeholder="name@organization.org" type="email" value={email} onChange={setEmail} />
          <AgeInput label="Age" placeholder="30" value={age} onChange={setAge} />
          {isMinorAge(age) && <GuardianEmailInput value={guardianEmail} onChange={setGuardianEmail} />}
          <PasswordInput label="Create Password" placeholder="••••••••" value={password} onChange={setPassword} />
          <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
          <ErrorBanner message={signupError} />
          <button
            onClick={handleCHWSignup}
            disabled={signupLoading}
            style={{ background: signupLoading ? C.muted : C.gold, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: signupLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {signupLoading ? <><Spinner /> Registering…</> : "Register Institution →"}
          </button>
        </div>
      )}

      {tab === "signup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <TextInput label="Full Name" placeholder="e.g., Amara Okafor" value={name} onChange={setName} />
          <TextInput label="Email Address" placeholder="name@example.com" type="email" value={email} onChange={setEmail} />
          <AgeInput
            label="Age" placeholder="Enter your age" value={age} onChange={setAge}
            hint="We ask for your age to tailor clinical guidance — it doesn't affect your access or pricing."
          />
          {isMinorAge(age) && <GuardianEmailInput value={guardianEmail} onChange={setGuardianEmail} />}
          <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>🎁</span>
            <span style={{ fontSize: "13px", color: "#92720A", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>
              Your account starts on our Free plan — no payment needed to begin.
            </span>
          </div>
          <PasswordInput label="Create Password" placeholder="••••••••" value={password} onChange={setPassword} />
          <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
          <ErrorBanner message={signupError} />
          <button
            onClick={handleSignup}
            disabled={signupLoading}
            style={{ background: signupLoading ? C.muted : C.pinkLight, color: C.mauve, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: signupLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {signupLoading ? <><Spinner /> Creating account…</> : "Create Account"}
          </button>
        </div>
      )}

      {tab === "login" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <TextInput label="Email Address" placeholder="grace@example.com" type="email" value={loginEmail} onChange={setLoginEmail} />
          <PasswordInput label="Password" placeholder="••••••••" value={loginPassword} onChange={setLoginPassword} />
          <div style={{ textAlign: "right" }}>
            <Link to="/reset-password" style={{ fontSize: "13px", color: C.pink, fontFamily: "system-ui, sans-serif", fontWeight: "500", textDecoration: "none" }}>Forgot password?</Link>
          </div>
          <ErrorBanner message={loginError} />
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{ background: loginLoading ? C.muted : C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: loginLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loginLoading ? <><Spinner /> Logging in…</> : "Log In"}
          </button>
        </div>
      )}

      <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: "14px", padding: "20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>⊕</div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#92720A", fontFamily: "Georgia, serif", marginBottom: "4px" }}>Represent a School, NGO, or CHW Program?</div>
          <div style={{ fontSize: "13px", color: "#92720A", fontFamily: "system-ui, sans-serif", marginBottom: "10px", lineHeight: "1.5" }}>Manage youth access codes and reach your community.</div>
          <span
            onClick={() => setTab("chw")}
            style={{ fontSize: "13px", fontWeight: "700", color: C.gold, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}
          >
            Institutional Portal Registration →
          </span>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: C.muted, textAlign: "center", fontFamily: "system-ui, sans-serif", margin: 0 }}>© 2026 SisterCircle+.</p>
    </div>
  );

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <style>{spinnerStyle}</style>

      {/* LEFT — Hero */}
      <div style={{ flex: "0 0 52%", background: "linear-gradient(160deg, #C4A898 0%, #8A7060 40%, #6A5048 100%)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "48px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(30,15,10,0.28)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "system-ui, sans-serif" }}>
            <div style={{ fontSize: "64px", marginBottom: "8px" }}>👩🏾‍⚕️</div>
            Replace with hero image
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: C.pinkLight, fontFamily: "Georgia, serif", marginBottom: "20px" }}>SisterCircle+</div>
          <h1 style={{ fontSize: "42px", fontWeight: "800", color: C.white, margin: "0 0 16px", fontFamily: "Georgia, serif", lineHeight: "1.2" }}>
            Your body has been speaking...
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.85)", margin: "0 0 32px", fontFamily: "system-ui, sans-serif", lineHeight: "1.7", maxWidth: "380px" }}>
            We're here to listen. Join a supportive community where clinical expertise meets the warmth of sisterhood.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex" }}>
              {["👩🏾", "👩🏿", "👩🏽"].map((e, i) => (
                <div key={i} style={{ width: "36px", height: "36px", borderRadius: "50%", background: `hsl(${20 + i * 15}, 40%, ${55 + i * 5}%)`, border: "2px solid rgba(255,255,255,0.6)", marginLeft: i > 0 ? "-10px" : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{e}</div>
              ))}
            </div>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", fontFamily: "system-ui, sans-serif" }}>
              <strong>5,000+</strong> Women tracking their health
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT — Auth panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 60px", background: C.bg, overflowY: "auto" }}>
        <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>

          <div style={{ display: "flex", background: "#EDE8E4", borderRadius: "100px", padding: "4px" }}>
            {["signup", "login", "chw"].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSignupError(""); setLoginError(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: "100px", border: "none", background: tab === t ? C.progressFill : "transparent", color: tab === t ? C.white : C.muted, fontSize: "14px", fontWeight: tab === t ? "700" : "500", cursor: "pointer", fontFamily: "system-ui, sans-serif", transition: "all 0.2s" }}
              >
                {t === "signup" ? "Sign Up" : t === "login" ? "Log In" : "Institution"}
              </button>
            ))}
          </div>

          {tab === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <TextInput label="Full Name" placeholder="Grace Adeleke" value={name} onChange={setName} />
              <TextInput label="Email Address" placeholder="grace@example.com" type="email" value={email} onChange={setEmail} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <AgeInput label="Age" placeholder="28" value={age} onChange={setAge} />
                <TextInput label="Location" placeholder="Lagos, NG" value={location} onChange={setLocation} />
              </div>
              {isMinorAge(age) && <GuardianEmailInput value={guardianEmail} onChange={setGuardianEmail} />}
              <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px" }}>🎁</span>
                <span style={{ fontSize: "13px", color: "#92720A", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>
                  Your account starts on our Free plan — no payment needed to begin.
                </span>
              </div>
              <PasswordInput label="Create Password" placeholder="••••••••" value={password} onChange={setPassword} />
              <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
              <ErrorBanner message={signupError} />
              <button
                onClick={handleSignup}
                disabled={signupLoading}
                style={{ background: signupLoading ? C.muted : C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: signupLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {signupLoading ? <><Spinner /> Creating account…</> : "Create Account"}
              </button>
            </div>
          )}

          {tab === "login" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <TextInput label="Email Address" placeholder="grace@example.com" type="email" value={loginEmail} onChange={setLoginEmail} />
              <PasswordInput label="Password" placeholder="••••••••" value={loginPassword} onChange={setLoginPassword} />
              <div style={{ textAlign: "right" }}>
                <Link to="/reset-password" style={{ fontSize: "13px", color: C.pink, fontFamily: "system-ui, sans-serif", fontWeight: "500", textDecoration: "none" }}>Forgot password?</Link>
              </div>
              <ErrorBanner message={loginError} />
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{ background: loginLoading ? C.muted : C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: loginLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {loginLoading ? <><Spinner /> Logging in…</> : "Log In"}
              </button>
            </div>
          )}

          {tab === "chw" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#92720A", fontFamily: "Georgia, serif", marginBottom: "8px" }}>Institutional Portal Registration</div>
                <p style={{ fontSize: "14px", color: "#92720A", fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
                  Register your school, NGO, or CHW program to manage youth access codes, reach your community, and access clinical diagnostic tools.
                </p>
              </div>
              <TextInput label="Contact Name" placeholder="e.g., Amina Yusuf" value={name} onChange={setName} />
              <TextInput label="Institution / School / NGO Name" placeholder="e.g., Kenyatta Girls' Secondary School" value={location} onChange={setLocation} />
              <TextInput label="Email Address" placeholder="name@organization.org" type="email" value={email} onChange={setEmail} />
              <AgeInput label="Age" placeholder="30" value={age} onChange={setAge} />
              {isMinorAge(age) && <GuardianEmailInput value={guardianEmail} onChange={setGuardianEmail} />}
              <PasswordInput label="Create Password" placeholder="••••••••" value={password} onChange={setPassword} />
              <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
              <ErrorBanner message={signupError} />
              <button
                onClick={handleCHWSignup}
                disabled={signupLoading}
                style={{ background: signupLoading ? C.muted : C.gold, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: signupLoading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {signupLoading ? <><Spinner /> Registering…</> : "Register Institution →"}
              </button>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "24px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>⊕</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif" }}>Represent a School, NGO, or CHW Program?</span>
            </div>
            <span
              onClick={() => setTab("chw")}
              style={{ fontSize: "13px", fontWeight: "700", color: C.gold, cursor: "pointer", fontFamily: "system-ui, sans-serif", textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              Register your institution here
            </span>
          </div>

          <p style={{ fontSize: "12px", color: C.muted, textAlign: "center", fontFamily: "system-ui, sans-serif", margin: 0 }}>
            © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
          </p>
        </div>
      </div>
    </div>
  );
}
