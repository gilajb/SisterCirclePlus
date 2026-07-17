import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const C = {
  bg: "#F7F3F0",
  white: "#FFFFFF",
  pink: "#D4547A",
  pinkLight: "#F9C4D2",
  pinkPale: "#FDE8EE",
  gold: "#C9A84C",
  goldLight: "#F5EDD6",
  charcoal: "#1A1A1A",
  body: "#444444",
  muted: "#888888",
  border: "#E8E0DC",
  trustBg: "#EFEFED",
  footerBg: "#1A1A1A",
  mauve: "#6B3A4A",
};

export default function LandingPage() {
  const [mobile, setMobile] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Don't render until auth check is done — avoids flash of landing for logged-in users
  if (!authChecked) return null;

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: C.bg, color: C.charcoal, margin: 0, padding: 0, overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: mobile ? "16px 20px" : "18px 48px",
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{ fontSize: "20px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>
          SisterCircle+
        </Link>
        {!mobile ? (
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <Link to="/dashboard" style={{
              fontSize: "15px", cursor: "pointer", color: C.charcoal,
              fontFamily: "system-ui, sans-serif",
              borderBottom: `2px solid ${C.pink}`,
              paddingBottom: "2px", fontWeight: "600",
              textDecoration: "none",
            }}>Dashboard</Link>
            <Link to="/symptom-check" style={{
              fontSize: "15px", cursor: "pointer", color: C.charcoal,
              fontFamily: "system-ui, sans-serif", fontWeight: "400",
              textDecoration: "none",
            }}>Symptom Check</Link>
            <span style={{
              fontSize: "15px", cursor: "pointer", color: C.charcoal,
              fontFamily: "system-ui, sans-serif", fontWeight: "400",
            }}>Resources</span>
            <span style={{ fontSize: "20px", cursor: "pointer" }}>🔔</span>
            <Link to="/signup" style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: C.border }} />
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <Link to="/signup" style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: C.border }} />
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{
        display: "flex", flexDirection: mobile ? "column" : "row",
        alignItems: "center", padding: mobile ? "40px 24px" : "60px 48px",
        gap: mobile ? "32px" : "48px", background: C.bg,
        maxWidth: "1200px", margin: "0 auto",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          <span style={{
            display: "inline-block", background: C.pinkPale, color: C.pink,
            fontSize: "13px", fontWeight: "600", padding: "5px 14px",
            borderRadius: "100px", width: "fit-content", fontFamily: "system-ui, sans-serif",
          }}>
            {mobile ? "❤ Sister-Physician Led Care" : "Welcome to SisterCircle+"}
          </span>
          <h1 style={{
            fontSize: mobile ? "30px" : "44px", fontWeight: "800",
            lineHeight: "1.2", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif",
          }}>
            Your body has been speaking. It's time{" "}
            <em style={{ color: C.pink, fontStyle: "italic" }}>someone listened.</em>
          </h1>
          <p style={{
            fontSize: "16px", lineHeight: "1.7", color: C.body, margin: 0,
            fontFamily: "system-ui, sans-serif", maxWidth: "420px",
          }}>
            {mobile
              ? "Expert medical diagnostics and compassionate guidance for women, powered by clinical data and communal warmth."
              : "We provide clinical warmth through sophisticated AI diagnostics tailored specifically for African women. Understand your health with dignity and clarity."}
          </p>
          <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "14px", marginTop: "8px" }}>
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <button style={{
                background: C.pink, color: C.white, border: "none",
                borderRadius: "8px", padding: "14px 28px",
                fontSize: "15px", fontWeight: "600", cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                width: mobile ? "100%" : "auto",
              }}>
                Check My Symptoms {mobile && "→"}
              </button>
            </Link>

            <Link to="/signup?type=chw" style={{ textDecoration: "none" }}>
              <button style={{
                background: "transparent", color: C.charcoal,
                border: `1.5px solid ${C.charcoal}`, borderRadius: "8px",
                padding: "13px 28px", fontSize: "15px", fontWeight: "600",
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
                width: mobile ? "100%" : "auto",
              }}>
                I'm a Health Worker
              </button>
            </Link>
          </div>
        </div>

        {!mobile && (
          <div style={{
            flex: "0 0 420px", height: "380px", borderRadius: "16px",
            background: "linear-gradient(135deg, #C4B4A8 0%, #8A7060 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
              <div style={{ fontSize: "80px" }}>👩🏾‍⚕️</div>
              <div style={{ fontSize: "13px", fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>Replace with hero image</div>
            </div>
          </div>
        )}

        {mobile && (
          <div style={{
            width: "100%", height: "220px", borderRadius: "16px",
            background: "linear-gradient(135deg, #C4B4A8 0%, #8A7060 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
              <div style={{ fontSize: "56px" }}>👩🏾‍⚕️</div>
            </div>
          </div>
        )}
      </section>

      {/* TRUST STRIP */}
      <div style={{
        background: C.trustBg, padding: "16px 48px",
        display: "flex", justifyContent: "center",
        gap: mobile ? "20px" : "60px", flexWrap: "wrap",
      }}>
        {(mobile
          ? [{ icon: "✓", label: "WHO Verified" }, { icon: "✓", label: "AfricaCDC" }, { icon: "✓", label: "SafeCare" }]
          : [{ icon: "🌍", label: "Global Reach" }, { icon: "✦", label: "AI-Powered" }, { icon: "📍", label: "African-First" }, { icon: "💻", label: "Free for Under 25s" }]
        ).map((t) => (
          <div key={t.label} style={{
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", fontWeight: "500",
          }}>
            <span>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>

      {/* WHY SISTERCIRCLE / DESIGNED FOR DIGNITY */}
      <section style={{ padding: mobile ? "56px 24px" : "72px 48px", background: C.bg }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{
            textAlign: "center", fontSize: mobile ? "24px" : "34px",
            fontWeight: "800", color: C.charcoal,
            marginBottom: "8px", fontFamily: "Georgia, serif",
          }}>
            {mobile ? "Designed for Dignity" : "Why SisterCircle+?"}
          </h2>
          {mobile && (
            <p style={{ textAlign: "center", fontSize: "14px", color: C.muted, marginBottom: "32px", fontFamily: "system-ui, sans-serif" }}>
              Modern healthcare that feels like family.
            </p>
          )}
          <div style={{ width: "40px", height: "3px", background: C.pink, margin: mobile ? "0 auto 32px" : "0 auto 48px" }} />
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
            gap: "20px",
          }}>
            {(mobile ? [
              { icon: "📊", iconBg: C.pinkPale, title: "Precision Triage", desc: "Clinical algorithms optimized for specific regional health profiles.", highlight: false },
              { icon: "👥", iconBg: C.goldLight, title: "Community Safe-Space", desc: "Connect with peers in moderated, secure circles for shared health journeys.", highlight: true },
              { icon: "✚", iconBg: C.pinkPale, title: "Emergency Referrals", desc: "Instant connection to local CHW networks for critical intervention.", highlight: false },
            ] : [
              { icon: "✦", iconBg: C.pinkPale, title: "AI-Powered Analysis", desc: "Our proprietary algorithms are trained on diverse datasets to provide the most accurate health insights for your unique profile.", highlight: false },
              { icon: "🛡", iconBg: C.pinkPale, title: "No Specialist Needed", desc: "Skip the waiting rooms. Get clinical-grade triage results and actionable next steps directly through your mobile device.", highlight: true },
              { icon: "♥", iconBg: C.goldLight, title: "Free for Under 25s", desc: "We believe health equity starts early. Every sister under 25 gets full access to our premium diagnostic tools at zero cost.", highlight: false },
            ]).map((card) => (
              <div key={card.title} style={{
                background: C.white,
                border: card.highlight ? `1.5px solid ${C.pink}` : `1px solid ${C.border}`,
                borderRadius: "16px", padding: "28px",
                display: "flex", flexDirection: "column", gap: "14px",
              }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "10px",
                  background: card.iconBg, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: "20px",
                }}>{card.icon}</div>
                <div style={{ fontSize: "17px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>{card.title}</div>
                <div style={{ fontSize: "14px", lineHeight: "1.65", color: C.body, fontFamily: "system-ui, sans-serif" }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL — mobile only */}
      {mobile && (
        <section style={{ background: C.mauve, padding: "48px 24px" }}>
          <div style={{ fontSize: "64px", fontWeight: "800", color: C.pinkLight, fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: "16px" }}>99</div>
          <blockquote style={{ fontSize: "17px", lineHeight: "1.7", color: C.white, margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            "SisterCircle+ gave me the words to describe my symptoms to my doctor when I felt overwhelmed. It's like having a doctor in the family."
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.pinkLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: C.mauve }}>AM</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: C.white, fontFamily: "system-ui, sans-serif" }}>Amara M.</div>
              <div style={{ fontSize: "13px", color: C.pinkLight, fontFamily: "system-ui, sans-serif" }}>Nairobi, Kenya</div>
            </div>
          </div>
        </section>
      )}

      {/* DIAGNOSTIC READINESS — mobile only */}
      {mobile && (
        <section style={{ background: C.bg, padding: "32px 24px" }}>
          <div style={{ background: C.white, borderRadius: "16px", padding: "24px", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>Diagnostic Readiness</span>
              <span style={{ fontSize: "14px", color: C.pink, fontWeight: "600", fontFamily: "system-ui, sans-serif" }}>85% Complete</span>
            </div>
            <div style={{ background: C.border, borderRadius: "100px", height: "8px", overflow: "hidden" }}>
              <div style={{ width: "85%", height: "100%", background: `linear-gradient(90deg, ${C.pink}, ${C.gold})`, borderRadius: "100px" }} />
            </div>
            <p style={{ fontSize: "14px", color: C.body, marginTop: "14px", fontFamily: "system-ui, sans-serif", margin: "14px 0 0" }}>
              Join 10,000+ women getting clearer medical answers today.
            </p>
          </div>
        </section>
      )}

      {/* SISTERCIRCLE EXPERIENCE — desktop only */}
      {!mobile && (
        <section style={{ padding: "72px 48px", background: C.bg }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", gap: "56px", alignItems: "center" }}>
            <div style={{
              flex: "0 0 340px", height: "340px", borderRadius: "16px",
              background: "linear-gradient(135deg, #3A2C22 0%, #6A4C38 50%, #2A4A2A 100%)",
              display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px",
            }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "system-ui, sans-serif" }}>
                <div style={{ fontSize: "44px", marginBottom: "6px" }}>👩🏾👩🏿👩🏽👩🏾</div>
                Replace with community image
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "34px", fontWeight: "800", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                The SisterCircle Experience
              </h2>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: C.body, margin: 0, fontFamily: "system-ui, sans-serif" }}>
                We bridge the gap between high-utility medical diagnostics and a supportive community space. It's not just about data; it's about being heard by a "physician-sister."
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {["Secure and private symptom analysis", "Immediate clinical triage recommendations", "Access to a network of supportive practitioners"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "15px", color: C.body, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${C.pink}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", color: C.pink }}>✓</div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: C.footerBg, padding: mobile ? "40px 24px 80px" : "48px 48px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr",
            gap: "32px", marginBottom: "32px",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", gridColumn: mobile ? "1 / -1" : "auto" }}>
              <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
              <p style={{ fontSize: "13px", color: "#999", lineHeight: "1.6", margin: 0, fontFamily: "system-ui, sans-serif" }}>
                Medical Clarity through Clinical Warmth. We bridge the gap between diagnostic data and the human heart.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>Product</span>
              <Link to="/symptom-check" style={{ fontSize: "13px", color: "#999", fontFamily: "system-ui, sans-serif", textDecoration: "none" }}>Symptom Check</Link>
              <span style={{ fontSize: "13px", color: "#999", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>Resources</span>
              <Link to="/dashboard" style={{ fontSize: "13px", color: "#999", fontFamily: "system-ui, sans-serif", textDecoration: "none" }}>Dashboard</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>About</span>
              {["Mission", "Privacy Policy", "Disclaimer"].map((l) => (
                <span key={l} style={{ fontSize: "13px", color: "#999", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{l}</span>
              ))}
            </div>
            {!mobile && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: C.pink, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>Contact</span>
                <span style={{ fontSize: "13px", color: "#999", fontFamily: "system-ui, sans-serif" }}>hello@sistercircleplus.com</span>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  {["↗", "✉"].map((icon) => (
                    <div key={icon} style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid #444", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", cursor: "pointer", fontSize: "14px" }}>{icon}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile bottom nav */}
          {mobile && (
            <div style={{ display: "flex", justifyContent: "space-around", padding: "16px 0", borderTop: "1px solid #333", marginTop: "8px" }}>
              <Link to="/" style={{ fontSize: "22px", textDecoration: "none" }}>🏠</Link>
              <Link to="/symptom-check" style={{ fontSize: "22px", textDecoration: "none" }}>🔍</Link>
              <Link to="/signup" style={{ fontSize: "22px", textDecoration: "none" }}>👤</Link>
              <Link to="/dashboard" style={{ fontSize: "22px", textDecoration: "none" }}>📋</Link>
            </div>
          )}

          <div style={{ borderTop: "1px solid #333", paddingTop: "20px", marginTop: mobile ? "8px" : "0" }}>
            <p style={{ fontSize: "12px", color: "#555", margin: 0, fontFamily: "system-ui, sans-serif" }}>
              © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
