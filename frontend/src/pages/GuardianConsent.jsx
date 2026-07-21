import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", mauve: "#6B3A4A", gold: "#C9A84C", goldLight: "#F5EDD6", goldBorder: "#E8D5A0",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

const spinnerStyle = `@keyframes gc-spin { to { transform: rotate(360deg); } }`;

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

export default function GuardianConsentPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const prefilledDecision = searchParams.get("decision"); // links from the email pre-select

  const [status, setStatus] = useState(uid && token ? "ready" : "missing");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvedDecision, setResolvedDecision] = useState(null);

  async function handleDecision(decision) {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/auth/guardian-consent/confirm/", { uid, token, decision });
      setResolvedDecision(data.decision || decision);
      setStatus("done");
    } catch (err) {
      setError(flattenErrors(err));
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{spinnerStyle}</style>
      <div style={{ maxWidth: "460px", width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "36px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Link to="/" style={{ fontSize: "16px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none", marginBottom: "6px" }}>SisterCircle+</Link>

        {status === "missing" && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
            <p style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", margin: 0 }}>This consent link is missing its token.</p>
          </div>
        )}

        {(status === "ready" || (status === "error" && !submitting)) && (
          <>
            <div style={{ fontSize: "32px" }}>🔑</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Guardian Consent Request</div>
            <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
              A SisterCircle+ account was created using your email as the parent/guardian
              contact for a young person under 16. SisterCircle+ provides confidential
              menstrual and reproductive health triage support.
            </p>
            <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
              They already have access to triage support regardless of your decision here —
              your response affects their account's longer-term standing, not whether they
              can get help right now.
            </p>
            {error && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "8px", padding: "10px 14px" }}>
                <p style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", margin: 0 }}>{error}</p>
              </div>
            )}
            {prefilledDecision === "approve" || prefilledDecision === "decline" ? (
              <p style={{ fontSize: "12px", color: C.gold, fontFamily: "system-ui, sans-serif", margin: "-6px 0 0", fontWeight: "600" }}>
                You clicked "{prefilledDecision === "approve" ? "Approve" : "Decline"}" in the email — confirm below to record it.
              </p>
            ) : null}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => handleDecision("decline")}
                disabled={submitting}
                style={{
                  flex: 1, borderRadius: "8px", padding: "13px", fontSize: "14px", fontWeight: "600",
                  cursor: submitting ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif",
                  background: prefilledDecision === "decline" ? C.goldLight : C.white,
                  color: C.body,
                  border: `1px solid ${prefilledDecision === "decline" ? C.goldBorder : C.border}`,
                }}
              >
                Decline
              </button>
              <button
                onClick={() => handleDecision("approve")}
                disabled={submitting}
                style={{
                  flex: 1, border: "none", borderRadius: "8px", padding: "13px", fontSize: "14px", fontWeight: "700",
                  cursor: submitting ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif",
                  color: C.white,
                  background: submitting ? C.muted : (prefilledDecision === "approve" ? C.pink : C.mauve),
                }}
              >
                {submitting ? "Submitting…" : "Approve"}
              </button>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: "32px" }}>✓</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>
              {resolvedDecision === "approve" ? "Consent recorded" : "Decision recorded"}
            </div>
            <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0 }}>
              Thank you — your response has been saved. Questions about this request can be
              sent to privacy@sistercircleplus.com.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
