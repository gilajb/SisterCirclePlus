import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { isLoggedIn } from "@/lib/auth";

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
  mauve: "#6B3A4A",
};

const DOCTOR_TIERS = [
  {
    key: "solo",
    name: "Solo Practitioner",
    price: "$24.99/mo",
    includes: ["Verified listing", "Referral inbox"],
    selfServe: true,
  },
  {
    key: "clinic",
    name: "Clinic (2–10)",
    price: "$69.99/mo",
    includes: ["Multi-provider listing", "Referral analytics dashboard"],
    selfServe: true,
    needsPractitionerCount: true,
  },
  {
    key: "hospital",
    name: "Hospital / Network",
    price: "$199.99/mo",
    priceNote: "negotiable",
    includes: ["Priority placement", "Scheduling / API integration", "Sales-led"],
    selfServe: false,
  },
];

const INSTITUTIONAL_TIERS = [
  { key: "pilot", name: "Pilot / Small", cohort: "≤500", annual: "Up to $1,250", perBeneficiary: "$2.49" },
  { key: "mid", name: "Mid-size", cohort: "501–2,000", annual: "$1,000 – $4,000", perBeneficiary: "$1.99" },
  { key: "large", name: "Large / Multi-site", cohort: "2,001–10,000", annual: "$3,000 – $15,000, negotiable", perBeneficiary: "$1.49" },
  { key: "national", name: "National / Gov", cohort: "10,000+", annual: "Custom, sales-led", perBeneficiary: "Sub-$0.99" },
];

function formatUsd(min, max) {
  const lo = Number(min);
  const hi = Number(max);
  if (lo === 0 && hi === 0) return "$0";
  if (lo === hi) return `$${lo.toFixed(2)}`;
  return `$${lo.toFixed(2)}–$${hi.toFixed(2)}`;
}

function billingCycleLabel(cycle) {
  return cycle === "one_time" ? "One-time" : "/mo";
}

function TierCard({ tier, onSubscribe, subscribing, redeemCode, setRedeemCode, onRedeem, redeeming, redeemError, redeemSuccess }) {
  const isUnder18 = tier.code === "under_18";
  const isFree = tier.code === "free";

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>
          {tier.name}
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: C.mauve, fontFamily: "Georgia, serif", marginTop: "6px" }}>
          {formatUsd(tier.price_min_usd, tier.price_max_usd)}
          <span style={{ fontSize: "13px", fontWeight: "500", color: C.muted }}> {billingCycleLabel(tier.billing_cycle)}</span>
        </div>
      </div>

      {tier.description && (
        <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
          {tier.description}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {(tier.features || []).map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif" }}>
            <span style={{ color: C.pink, flexShrink: 0 }}>✓</span>
            {f}
          </div>
        ))}
      </div>

      {isUnder18 ? (
        redeemSuccess ? (
          <div
            style={{
              background: "#F0FFF4",
              border: "1px solid #A8D5B5",
              borderRadius: "10px",
              padding: "14px 16px",
              fontSize: "13px",
              color: "#2E7D52",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "600",
              textAlign: "center",
              lineHeight: "1.5",
            }}
          >
            ✓ Code redeemed — you now have under-18 access.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.5" }}>
              Ask your school or CHW program for an access code, then redeem it here — this tier isn't available through individual sign-up.
            </p>
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter access code"
              style={{
                width: "100%",
                padding: "11px 14px",
                border: `1px solid ${C.inputBorder}`,
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "system-ui, monospace",
                letterSpacing: "2px",
                color: C.charcoal,
                background: C.white,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {redeemError && (
              <p style={{ fontSize: "12px", color: "#B91C1C", fontFamily: "system-ui, sans-serif", margin: 0 }}>{redeemError}</p>
            )}
            <button
              onClick={onRedeem}
              disabled={redeeming}
              style={{
                background: redeeming ? C.muted : C.goldLight,
                color: "#92720A",
                border: `1px solid ${C.goldBorder}`,
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: redeeming ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {redeeming ? "Redeeming…" : "Redeem Code"}
            </button>
          </div>
        )
      ) : (
        <button
          onClick={() => onSubscribe(tier)}
          disabled={subscribing === tier.code}
          style={{
            background: isFree ? C.pinkPale : C.mauve,
            color: isFree ? C.mauve : C.white,
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: subscribing === tier.code ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {isFree ? "Get Started Free" : subscribing === tier.code ? "Redirecting…" : "Subscribe"}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tiersError, setTiersError] = useState("");
  const [subscribing, setSubscribing] = useState("");

  const [lead, setLead] = useState({ org_name: "", contact_name: "", email: "", phone: "", estimated_cohort_size: "", message: "" });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");

  const [doctorSubscribing, setDoctorSubscribing] = useState("");
  const [doctorError, setDoctorError] = useState("");
  const [practitionerCount, setPractitionerCount] = useState(2);

  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    api
      .get("/api/billing/pricing/")
      .then((res) => setTiers(res.data))
      .catch(() => setTiersError("Couldn't load pricing right now. Please try again shortly."))
      .finally(() => setTiersLoading(false));
  }, []);

  async function handleSubscribe(tier) {
    if (tier.code === "free") {
      navigate("/signup");
      return;
    }
    if (!isLoggedIn()) {
      navigate(`/signup?next=pricing`);
      return;
    }
    setSubscribing(tier.code);
    try {
      const { data } = await api.post("/api/billing/checkout/", {
        tier_code: tier.code,
        callback_url: `${window.location.origin}/dashboard`,
      });
      window.location.href = data.authorization_url;
    } catch (err) {
      setTiersError(err.response?.data?.detail || "Couldn't start checkout. Please try again.");
      setSubscribing("");
    }
  }

  async function handleDoctorSubscribe(tier) {
    if (!tier.selfServe) {
      document.getElementById("institutional-lead")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!isLoggedIn()) {
      navigate(`/signup?next=pricing`);
      return;
    }
    setDoctorError("");
    setDoctorSubscribing(tier.key);
    try {
      const { data } = await api.post("/api/billing/doctor-checkout/", {
        tier: tier.key,
        ...(tier.needsPractitionerCount && { practitioner_count: practitionerCount }),
        callback_url: `${window.location.origin}/dashboard`,
      });
      window.location.href = data.authorization_url;
    } catch (err) {
      setDoctorError(err.response?.data?.detail || "Couldn't start checkout. Please try again.");
      setDoctorSubscribing("");
    }
  }

  async function handleRedeemCode() {
    setRedeemError("");
    const code = redeemCode.trim();
    if (!code) {
      setRedeemError("Please enter a code.");
      return;
    }
    if (!isLoggedIn()) {
      navigate(`/signup?next=pricing`);
      return;
    }
    setRedeeming(true);
    try {
      await api.post("/api/billing/redeem-code/", { code });
      setRedeemSuccess(true);
      setRedeemCode("");
    } catch (err) {
      setRedeemError(err.response?.data?.detail || "Couldn't redeem this code. Please check it and try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function handleLeadSubmit(e) {
    e.preventDefault();
    setLeadError("");
    if (!lead.org_name || !lead.email) {
      setLeadError("Please share at least your organization name and email.");
      return;
    }
    setLeadSubmitting(true);
    try {
      await api.post("/api/billing/institutional-lead/", {
        ...lead,
        estimated_cohort_size: lead.estimated_cohort_size ? Number(lead.estimated_cohort_size) : undefined,
      });
      setLeadSubmitted(true);
    } catch {
      setLeadError("Something went wrong sending your message. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    border: `1px solid ${C.inputBorder}`,
    borderRadius: "10px",
    fontSize: "15px",
    fontFamily: "system-ui, sans-serif",
    color: C.charcoal,
    background: C.white,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = { fontSize: "13px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ padding: mobile ? "20px 24px" : "24px 48px", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>
          SisterCircle+
        </Link>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: mobile ? "40px 24px 80px" : "56px 48px 96px" }}>
        <div style={{ textAlign: "center", marginBottom: mobile ? "40px" : "56px" }}>
          <h1 style={{ fontSize: mobile ? "28px" : "38px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 12px" }}>
            Pricing
          </h1>
          <p style={{ fontSize: "15px", color: C.body, fontFamily: "system-ui, sans-serif", maxWidth: "560px", margin: "0 auto", lineHeight: "1.7" }}>
            Clear, tiered access for the people we serve, the clinicians they reach, and the
            institutions that bring us to entire communities.
          </p>
        </div>

        {/* ── USER TIERS ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? "56px" : "72px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "20px" }}>
            For You
          </h2>

          {tiersLoading && (
            <p style={{ fontSize: "14px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>Loading pricing…</p>
          )}
          {tiersError && (
            <p style={{ fontSize: "14px", color: C.pink, fontFamily: "system-ui, sans-serif" }}>{tiersError}</p>
          )}

          {!tiersLoading && tiers.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "repeat(4, 1fr)",
                gap: "20px",
              }}
            >
              {tiers.map((tier) => (
                <TierCard
                  key={tier.code}
                  tier={tier}
                  onSubscribe={handleSubscribe}
                  subscribing={subscribing}
                  redeemCode={redeemCode}
                  setRedeemCode={setRedeemCode}
                  onRedeem={handleRedeemCode}
                  redeeming={redeeming}
                  redeemError={redeemError}
                  redeemSuccess={redeemSuccess}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── DOCTOR / CLINIC TIERS ─────────────────────────────────────── */}
        <section style={{ marginBottom: mobile ? "56px" : "72px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "8px" }}>
            For Doctors &amp; Clinics
          </h2>
          <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", marginBottom: "20px" }}>
            A flat platform-access subscription — never per-patient or referral-commission based.
          </p>
          {doctorError && (
            <p style={{ fontSize: "13px", color: "#B91C1C", fontFamily: "system-ui, sans-serif", marginBottom: "16px" }}>{doctorError}</p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: "20px" }}>
            {DOCTOR_TIERS.map((t) => (
              <div key={t.key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>{t.name}</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: C.mauve, fontFamily: "Georgia, serif", margin: "6px 0 14px" }}>
                    {t.price}
                    {t.priceNote && <span style={{ fontSize: "12px", fontWeight: "500", color: C.muted }}> {t.priceNote}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {t.includes.map((i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif" }}>
                        <span style={{ color: C.pink, flexShrink: 0 }}>✓</span>
                        {i}
                      </div>
                    ))}
                  </div>
                </div>

                {t.needsPractitionerCount && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
                      Number of practitioners
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={practitionerCount}
                      onChange={(e) => setPractitionerCount(Math.min(10, Math.max(2, Number(e.target.value) || 2)))}
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.inputBorder}`, borderRadius: "8px", fontSize: "14px", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                    />
                  </div>
                )}

                <button
                  onClick={() => handleDoctorSubscribe(t)}
                  disabled={doctorSubscribing === t.key}
                  style={{
                    marginTop: "auto",
                    background: t.selfServe ? C.mauve : C.goldLight,
                    color: t.selfServe ? C.white : "#92720A",
                    border: t.selfServe ? "none" : `1px solid ${C.goldBorder}`,
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: doctorSubscribing === t.key ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {t.selfServe
                    ? doctorSubscribing === t.key
                      ? "Redirecting…"
                      : "Subscribe"
                    : "Contact Sales"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── INSTITUTIONAL LICENSING ───────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "8px" }}>
            For NGOs, Schools &amp; CHW Programs
          </h2>
          <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", marginBottom: "20px", maxWidth: "640px", lineHeight: "1.6" }}>
            Priced per-beneficiary/year within a negotiated range. Every institutional tier bundles
            unlimited free/discounted cohort access, bulk CHW code generation and a management
            dashboard, aggregate anonymized reporting, priority CHW onboarding, and a co-branding option.
          </p>

          <div style={{ overflowX: "auto", marginBottom: "36px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: mobile ? "560px" : "auto" }}>
              <thead>
                <tr>
                  {["Cohort", "Size", "Annual Price", "Per-Beneficiary"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: C.pink,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        fontFamily: "system-ui, sans-serif",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTITUTIONAL_TIERS.map((row) => (
                  <tr key={row.key}>
                    <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: "600", color: C.charcoal, fontFamily: "system-ui, sans-serif", borderBottom: `1px solid ${C.border}` }}>
                      {row.name}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", borderBottom: `1px solid ${C.border}` }}>
                      {row.cohort}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", borderBottom: `1px solid ${C.border}` }}>
                      {row.annual}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", borderBottom: `1px solid ${C.border}` }}>
                      {row.perBeneficiary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Talk to us — the ONLY CTA for this section, no self-serve checkout.
              Also the scroll target for the Hospital/Network "Contact Sales" button above. */}
          <div id="institutional-lead" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: mobile ? "24px" : "32px", maxWidth: "560px" }}>
            {leadSubmitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>✓</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", marginBottom: "6px" }}>
                  Thank you — we'll be in touch.
                </div>
                <p style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0 }}>
                  Our team reviews every institutional inquiry personally.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Talk to us</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={labelStyle}>Organization name *</label>
                  <input style={inputStyle} value={lead.org_name} onChange={(e) => setLead({ ...lead, org_name: e.target.value })} placeholder="e.g., Amani Youth Initiative" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={labelStyle}>Contact name</label>
                  <input style={inputStyle} value={lead.contact_name} onChange={(e) => setLead({ ...lead, contact_name: e.target.value })} placeholder="Your name" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={labelStyle}>Email *</label>
                    <input style={inputStyle} type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="name@organization.org" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="+254…" />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={labelStyle}>Estimated cohort size</label>
                  <input style={inputStyle} inputMode="numeric" value={lead.estimated_cohort_size} onChange={(e) => setLead({ ...lead, estimated_cohort_size: e.target.value.replace(/\D/g, "") })} placeholder="e.g., 800" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "90px", resize: "vertical", fontFamily: "system-ui, sans-serif" }}
                    value={lead.message}
                    onChange={(e) => setLead({ ...lead, message: e.target.value })}
                    placeholder="Tell us a little about your program…"
                  />
                </div>
                {leadError && (
                  <p style={{ fontSize: "13px", color: "#B91C1C", fontFamily: "system-ui, sans-serif", margin: 0 }}>{leadError}</p>
                )}
                <button
                  type="submit"
                  disabled={leadSubmitting}
                  style={{
                    background: leadSubmitting ? C.muted : C.mauve,
                    color: C.white,
                    border: "none",
                    borderRadius: "10px",
                    padding: "14px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: leadSubmitting ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {leadSubmitting ? "Sending…" : "Talk to us →"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
