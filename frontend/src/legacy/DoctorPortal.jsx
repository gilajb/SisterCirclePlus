import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/axios";
import { requireAuth, removeToken } from "@/lib/auth";

const MAX_PAYMENT_POLL_ATTEMPTS = 8; // ~24s at 3s intervals

// ---------------------------------------------------------------------------
// Design tokens — matches CHW.jsx / Dashboard.jsx
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
  errorBg: "#FEF2F2", errorBorder: "#FECACA", errorText: "#B91C1C",
};

const TIER_LABELS = { solo: "Solo Practitioner", clinic: "Clinic (2–10)", hospital: "Hospital / Network" };
const STATUS_LABELS = { active: "Active", pending: "Pending", past_due: "Past Due", cancelled: "Cancelled" };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function riskBadgeConfig(tier) {
  if (tier === "urgent") return { label: "URGENT", bg: C.urgentBg, color: C.urgent, border: C.urgentBorder };
  return { label: "REFER", bg: C.referBg, color: C.refer, border: C.goldBorder };
}

function RiskBadge({ tier }) {
  const c = riskBadgeConfig(tier);
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
      padding: "3px 10px", borderRadius: "100px",
      fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
    }}>{c.label}</span>
  );
}

function firstConditionName(submission) {
  const conditions = submission?.ai_result?.conditions;
  if (Array.isArray(conditions) && conditions.length > 0) return conditions[0].name;
  return null;
}

function CaseCard({ submission, busy, onClaim, onRelease, onResolve }) {
  const condition = firstConditionName(submission);
  return (
    <div style={{ background: C.white, border: `1px solid ${submission.claimed_by_me ? C.gold : C.border}`, borderRadius: "12px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: C.charcoal, fontFamily: "system-ui, sans-serif" }}>
            Case #{submission.id}{submission.age ? ` — Age ${submission.age}` : ""}
          </div>
          {submission.location && (
            <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "2px" }}>📍 {submission.location}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {submission.claimed_by_me && (
            <span style={{ background: C.goldLight, color: "#92720A", border: `1px solid ${C.goldBorder}`, fontSize: "10px", fontWeight: "700", padding: "3px 9px", borderRadius: "100px", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>YOU'RE HANDLING THIS</span>
          )}
          <RiskBadge tier={submission.risk_tier} />
        </div>
      </div>
      {condition && (
        <div style={{ fontSize: "13px", color: C.body, fontFamily: "system-ui, sans-serif" }}>
          <strong style={{ color: C.charcoal }}>{condition}</strong>
        </div>
      )}
      {submission.symptoms?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {submission.symptoms.slice(0, 5).map((s) => (
            <span key={s} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "100px", padding: "3px 10px", fontSize: "12px", color: C.body, fontFamily: "system-ui, sans-serif" }}>{s}</span>
          ))}
        </div>
      )}
      <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>{timeAgo(submission.created_at)}</div>

      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {submission.claimed_by_me ? (
          <>
            <button
              onClick={onResolve}
              disabled={busy}
              style={{ flex: 1, background: busy ? C.muted : C.stable, color: C.white, border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "700", cursor: busy ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif" }}
            >
              {busy ? "…" : "✓ Mark Resolved"}
            </button>
            <button
              onClick={onRelease}
              disabled={busy}
              style={{ background: C.white, color: C.body, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", cursor: busy ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif" }}
            >
              Release
            </button>
          </>
        ) : (
          <button
            onClick={onClaim}
            disabled={busy}
            style={{ flex: 1, background: busy ? C.muted : C.mauve, color: C.white, border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "700", cursor: busy ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            {busy ? "Claiming…" : "Claim Case"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscription gate — shown when the user has no active DoctorSubscription
// ---------------------------------------------------------------------------
function SubscriptionGate({ subscription, mobile }) {
  const notSubscribed = !subscription?.has_subscription;
  const heading = notSubscribed ? "Doctor Portal access requires a subscription" : "Your subscription isn't active";
  const detail = notSubscribed
    ? "Subscribe as a Solo Practitioner, Clinic, or Hospital/Network to unlock the referral inbox."
    : `Your ${TIER_LABELS[subscription.tier] || subscription.tier} subscription is currently ${STATUS_LABELS[subscription.status] || subscription.status}. Please update your billing to regain access.`;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? "24px" : "48px" }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "40px 32px", maxWidth: "420px", width: "100%", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "36px" }}>🩺</div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>{heading}</div>
        <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>{detail}</p>
        <Link to="/pricing" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", background: C.mauve, color: C.white, border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>
            View Pricing →
          </button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment processing — shown instead of SubscriptionGate right after a Paystack
// redirect, while the webhook that actually activates the subscription is still in
// flight. Without this, a doctor who just paid would land here and see "you need to
// subscribe" — indistinguishable from a failed payment.
// ---------------------------------------------------------------------------
function PaymentProcessingScreen({ mobile }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? "24px" : "48px" }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "40px 32px", maxWidth: "420px", width: "100%", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
        <span style={{ display: "inline-block", width: "32px", height: "32px", margin: "0 auto", border: "3px solid rgba(107,58,74,0.2)", borderTopColor: C.mauve, borderRadius: "50%", animation: "dp-spin 0.8s linear infinite" }} />
        <style>{"@keyframes dp-spin { to { transform: rotate(360deg); } }"}</style>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif" }}>Confirming your payment…</div>
        <p style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: "1.6" }}>
          Paystack confirmed your payment — we're just waiting on the activation to land. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DoctorPortalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
  const [mobile, setMobile] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [pollAttempts, setPollAttempts] = useState(0);

  const [cases, setCases] = useState([]);
  const [casesTotal, setCasesTotal] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [casesLoading, setCasesLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [casesError, setCasesError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!requireAuth(navigate)) return;
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    api.get("/api/billing/doctor-subscription/")
      .then((res) => setSubscription(res.data))
      .catch(() => setSubscription({ has_subscription: false }))
      .finally(() => setSubscriptionLoading(false));
  }, [authChecked, pollAttempts]);

  const isActive = subscription?.has_subscription && subscription.status === "active";
  // Only poll if we arrived from an actual Paystack redirect (a reference/trxref param
  // present) — never for someone who just navigates here without having paid.
  const isPollingPayment = !!paymentReference && subscription !== null && !isActive && pollAttempts < MAX_PAYMENT_POLL_ATTEMPTS;

  useEffect(() => {
    if (!isPollingPayment) return;
    const timer = setTimeout(() => setPollAttempts((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [isPollingPayment]);

  useEffect(() => {
    if (!isActive) return;
    api.get("/api/doctor/referrals/")
      .then((res) => {
        setCases(res.data.results);
        setCasesTotal(res.data.count);
        setNextPageUrl(res.data.next);
      })
      .catch((err) => setCasesError(
        err.response?.data?.detail || "Couldn't load the referral inbox right now. Please try again shortly."
      ))
      .finally(() => setCasesLoading(false));
  }, [isActive]);

  async function handleLoadMore() {
    if (!nextPageUrl) return;
    setLoadingMore(true);
    try {
      // `next` is already an absolute URL from DRF's pagination — axios uses it as-is
      // rather than joining it with the api client's baseURL.
      const { data } = await api.get(nextPageUrl);
      setCases((prev) => [...prev, ...data.results]);
      setNextPageUrl(data.next);
    } catch {
      setCasesError("Couldn't load more cases right now. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleClaim(id) {
    setActionError("");
    setActingId(id);
    try {
      const { data } = await api.post(`/api/doctor/referrals/${id}/claim/`);
      setCases((prev) => prev.map((c) => (c.id === id ? data : c)));
    } catch (err) {
      if (err.response?.status === 409) {
        setCases((prev) => prev.filter((c) => c.id !== id));
        setCasesTotal((t) => t - 1); // no longer in this doctor's view of the shared pool
        setActionError("This case was just claimed by another provider.");
      } else {
        setActionError("Couldn't claim this case. Please try again.");
      }
    } finally {
      setActingId(null);
    }
  }

  async function handleRelease(id) {
    setActionError("");
    setActingId(id);
    try {
      const { data } = await api.post(`/api/doctor/referrals/${id}/release/`);
      setCases((prev) => prev.map((c) => (c.id === id ? data : c)));
    } catch {
      setActionError("Couldn't release this case. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function handleResolve(id) {
    setActionError("");
    setActingId(id);
    try {
      await api.post(`/api/doctor/referrals/${id}/resolve/`);
      setCases((prev) => prev.filter((c) => c.id !== id));
      setCasesTotal((t) => t - 1);
    } catch {
      setActionError("Couldn't mark this case as resolved. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  if (!authChecked || subscriptionLoading) return null;
  if (isPollingPayment) return <PaymentProcessingScreen mobile={mobile} />;
  if (!isActive) return <SubscriptionGate subscription={subscription} mobile={mobile} />;

  const urgentCount = cases.filter((c) => c.risk_tier === "urgent").length;
  const referCount = cases.filter((c) => c.risk_tier === "refer").length;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: C.bg, color: C.charcoal, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* SIDEBAR — desktop only */}
        {!mobile && (
          <aside style={{ width: "232px", flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "28px 0", position: "sticky", top: 0, height: "100vh" }}>
            <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.pink, letterSpacing: "0.5px", fontFamily: "system-ui, sans-serif", marginBottom: "2px" }}>Doctor Portal</div>
              <div style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif" }}>{TIER_LABELS[subscription.tier] || subscription.tier}</div>
            </div>
            <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: C.sidebarActive, fontFamily: "system-ui, sans-serif", fontSize: "14px", fontWeight: "700", color: C.charcoal }}>
                <span>📋</span>Referral Inbox
              </div>
            </div>
            <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ background: C.goldLight, color: "#92720A", border: `1px solid ${C.goldBorder}`, fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "100px", fontFamily: "system-ui, sans-serif", textAlign: "center", marginBottom: "8px" }}>
                {STATUS_LABELS[subscription.status] || subscription.status}
              </span>
              <Link to="/settings" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "13px", color: C.muted }}>
                  <span>⚙</span> Account Settings
                </div>
              </Link>
              <div onClick={() => { removeToken(); navigate("/signup"); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: "13px", color: C.muted }}>
                <span>→</span> Log Out
              </div>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "16px 20px" : "20px 32px", borderBottom: `1px solid ${C.border}`, background: C.white, position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: mobile ? "18px" : "22px", fontWeight: "800", color: C.charcoal, margin: 0, fontFamily: "Georgia, serif" }}>
                Referral Inbox
              </h1>
              <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "2px" }}>
                Platform-wide cases flagged for clinical follow-up
              </div>
            </div>
            {mobile && (
              <Link to="/" style={{ fontSize: "14px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
            )}
          </div>

          <div style={{ padding: mobile ? "20px" : "28px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "12px" }}>
              <div style={{ background: C.urgentBg, border: `1px solid ${C.urgentBorder}`, borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "24px", fontWeight: "800", color: C.urgent, fontFamily: "Georgia, serif" }}>{urgentCount}</div>
                <div style={{ fontSize: "12px", color: C.urgent, fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Urgent</div>
              </div>
              <div style={{ background: C.referBg, border: `1px solid ${C.goldBorder}`, borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#92720A", fontFamily: "Georgia, serif" }}>{referCount}</div>
                <div style={{ fontSize: "12px", color: "#92720A", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Refer</div>
              </div>
              {!mobile && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif" }}>{casesTotal}</div>
                  <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Total open cases</div>
                </div>
              )}
            </div>
            {cases.length < casesTotal && (
              <div style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "-12px" }}>
                Urgent/Refer counts above reflect the {cases.length} cases loaded so far, not all {casesTotal}.
              </div>
            )}

            {(casesError || actionError) && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: C.errorText, fontFamily: "system-ui, sans-serif" }}>
                {casesError || actionError}
              </div>
            )}

            {casesLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>Loading referral inbox…</div>
            ) : cases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>No urgent or refer-tier cases right now.</div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {cases.map((c) => (
                    <CaseCard
                      key={c.id}
                      submission={c}
                      busy={actingId === c.id}
                      onClaim={() => handleClaim(c.id)}
                      onRelease={() => handleRelease(c.id)}
                      onResolve={() => handleResolve(c.id)}
                    />
                  ))}
                </div>
                {nextPageUrl && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      background: C.white, color: C.mauve, border: `1px solid ${C.border}`,
                      borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: "700",
                      cursor: loadingMore ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {loadingMore ? "Loading…" : `Load More Cases (${casesTotal - cases.length} remaining)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
