import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  pinkLight: "#F9C4D2", pinkPale: "#FDE8EE",
  gold: "#C9A84C", goldLight: "#F5EDD6", goldBorder: "#E8D5A0",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", inputBorder: "#D8CCC8", mauve: "#6B3A4A",
  progressFill: "#8B5A6A",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

const spinnerStyle = `@keyframes rp-spin { to { transform: rotate(360deg); } }`;

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: C.white, borderRadius: "50%", animation: "rp-spin 0.7s linear infinite" }} />
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>{message}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "13px 16px",
  border: `1px solid ${C.inputBorder}`, borderRadius: "10px",
  fontSize: "15px", fontFamily: "system-ui, sans-serif",
  color: C.charcoal, background: C.white,
  outline: "none", boxSizing: "border-box",
};
const labelStyle = { fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" };

// ---------------------------------------------------------------------------
// Step 1 — request a reset link by email
// ---------------------------------------------------------------------------
function RequestStep() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/request/", { email });
      setSent(true);
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "32px" }}>✓</div>
        <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Check your email</div>
        <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "6px" }}>Reset your password</div>
        <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: 0 }}>Enter your email and we'll send you a link to reset it.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={labelStyle}>Email Address</label>
        <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="grace@example.com" />
      </div>
      <ErrorBanner message={error} />
      <button
        type="submit"
        disabled={loading}
        style={{ background: loading ? C.muted : C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        {loading ? <><Spinner /> Sending…</> : "Send Reset Link"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — set a new password (uid/token present in the URL from the emailed link)
// ---------------------------------------------------------------------------
function ConfirmStep({ uid, token }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!password || !password2) {
      setError("Please fill in both password fields.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/confirm/", { uid, token, password, password2 });
      setDone(true);
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "32px" }}>✓</div>
        <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Password reset</div>
        <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0 }}>Your password has been changed.</p>
        <Link to="/signup" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", background: C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>
            Log In →
          </button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Choose a new password</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={labelStyle}>New Password</label>
        <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={labelStyle}>Confirm New Password</label>
        <input style={inputStyle} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" />
      </div>
      <ErrorBanner message={error} />
      <button
        type="submit"
        disabled={loading}
        style={{ background: loading ? C.muted : C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        {loading ? <><Spinner /> Resetting…</> : "Reset Password"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{spinnerStyle}</style>
      <div style={{ maxWidth: "420px", width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "36px 32px" }}>
        <Link to="/" style={{ fontSize: "16px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none", display: "block", marginBottom: "24px" }}>SisterCircle+</Link>
        {uid && token ? <ConfirmStep uid={uid} token={token} /> : <RequestStep />}
      </div>
    </div>
  );
}
