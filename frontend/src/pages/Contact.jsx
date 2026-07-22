import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { sanitizeText, validateEmail } from "@/lib/sanitize";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  pinkLight: "#F9C4D2", pinkPale: "#FDE8EE",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", inputBorder: "#D8CCC8", mauve: "#6B3A4A",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
  successBg: "#EDF7ED", successBorder: "#BFE3BF", successText: "#1E6B1E",
};

const spinnerStyle = `@keyframes sc-spin { to { transform: rotate(360deg); } }`;

const TOPICS = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Account or technical support" },
  { value: "partnership", label: "Partnership or institution" },
  { value: "press", label: "Press or media" },
];

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
        {label}
      </label>
      {children}
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

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: C.white, borderRadius: "50%", animation: "sc-spin 0.7s linear infinite" }} />
  );
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanName = sanitizeText(name, 100);
    const cleanMessage = sanitizeText(message, 2000);

    if (!cleanName || !email || !cleanMessage) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error);
      return;
    }
    if (cleanMessage.length < 10) {
      setError("Please include a bit more detail in your message.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/contact/", {
        name: cleanName,
        email,
        topic,
        message: cleanMessage,
      });
      setSent(true);
      setName("");
      setEmail("");
      setTopic("general");
      setMessage("");
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <style>{spinnerStyle}</style>

      <div style={{ padding: "24px 48px", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>
          SisterCircle+
        </Link>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px 96px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>
          Contact Us
        </h1>
        <p style={{ fontSize: "14px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: "0 0 32px", lineHeight: "1.6" }}>
          Questions, feedback, or a partnership inquiry — send us a message and we'll get back to
          you. You can also reach us directly at{" "}
          <strong style={{ color: C.body }}>sistercircleplus@protonmail.com</strong>.
        </p>

        {sent ? (
          <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: "10px", padding: "20px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>✓</span>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: C.successText, fontFamily: "system-ui, sans-serif" }}>
                Thanks for reaching out
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: C.successText, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
                We've received your message and will get back to you soon.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {error && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
                  {error}
                </span>
              </div>
            )}

            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                style={inputStyle}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </Field>

            <Field label="Topic">
              <select value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle}>
                {TOPICS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Message">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={6}
                maxLength={2000}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui, sans-serif" }}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: C.pink, color: C.white, border: "none",
                borderRadius: "8px", padding: "14px 28px",
                fontSize: "15px", fontWeight: "600", cursor: loading ? "default" : "pointer",
                fontFamily: "system-ui, sans-serif", opacity: loading ? 0.8 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {loading ? <Spinner /> : "Send Message"}
            </button>
          </form>
        )}

        <p style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "48px" }}>
          © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
        </p>
      </div>
    </div>
  );
}
