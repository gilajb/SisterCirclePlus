import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", progressFill: "#8B5A6A",
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

function flattenErrors(err) {
  if (!err.response?.data) return "Something went wrong. Please try again.";
  const data = err.response.data;
  if (typeof data === "string") return data;
  const messages = Object.values(data).flat();
  return messages.length ? messages.join(" ") : "Something went wrong.";
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [status, setStatus] = useState(uid && token ? "verifying" : "missing");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!(uid && token)) return;
    api.post("/api/auth/verify-email/confirm/", { uid, token })
      .then(() => setStatus("done"))
      .catch((err) => {
        setError(flattenErrors(err));
        setStatus("error");
      });
  }, [uid, token]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "420px", width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "36px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
        <Link to="/" style={{ fontSize: "16px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none", marginBottom: "10px" }}>SisterCircle+</Link>

        {status === "verifying" && (
          <p style={{ fontSize: "14px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Verifying your email…</p>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: "32px" }}>✓</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Email verified</div>
            <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0 }}>Your email address has been confirmed.</p>
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", background: C.progressFill, color: C.white, border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>
                Go to Dashboard →
              </button>
            </Link>
          </>
        )}

        {(status === "error" || status === "missing") && (
          <>
            <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif", margin: 0 }}>
                {status === "missing" ? "This verification link is missing its token." : error}
              </p>
            </div>
            <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: 0 }}>
              You can request a new verification email from your dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
