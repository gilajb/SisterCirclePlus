import { Link } from "react-router-dom";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", mauve: "#6B3A4A",
};

export default function NotFoundPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "420px", width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "48px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "40px" }}>🌸</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Page not found</div>
        <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
          The page you're looking for doesn't exist, or may have moved.
        </p>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", background: C.mauve, color: C.white, border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
