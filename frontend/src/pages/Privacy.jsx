import { Link } from "react-router-dom";

const C = {
  bg: "#F7F3F0", white: "#FFFFFF", pink: "#D4547A",
  charcoal: "#1A1A1A", body: "#444444", muted: "#888888",
  border: "#E8E0DC", mauve: "#6B3A4A",
};

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 12px" }}>{title}</h2>
      <div style={{ fontSize: "14px", color: C.body, fontFamily: "system-ui, sans-serif", lineHeight: "1.7" }}>{children}</div>
    </section>
  );
}

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "8px" };
const thStyle = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: "700", fontFamily: "system-ui, sans-serif" };
const tdStyle = { padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.body, fontFamily: "system-ui, sans-serif" };

export default function PrivacyPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ padding: "24px 48px", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 96px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: "0 0 40px" }}>
          Version 1.0 — Effective July 2026 — SisterCirclePlus. For the full technical detail behind this policy, see our public SECURITY.md.
        </p>

        <Section title="1. Our Approach">
          <p>
            SisterCircle+ is built on <strong>minimum necessary data</strong>: we collect only what's
            clinically or operationally required, never sell your data, and never use it for
            advertising. This policy explains what we collect, why, and the rights you have over it
            — wherever in the world you're using SisterCircle+ from.
          </p>
        </Section>

        <Section title="2. What We Collect">
          <p style={{ marginBottom: "6px", fontWeight: "700", color: C.charcoal }}>Account data</p>
          <table style={tableStyle}>
            <thead><tr><th style={thStyle}>Field</th><th style={thStyle}>Why</th><th style={thStyle}>Required</th></tr></thead>
            <tbody>
              <tr><td style={tdStyle}>Username, email, password</td><td style={tdStyle}>Login and account recovery</td><td style={tdStyle}>Yes</td></tr>
              <tr><td style={tdStyle}>Age</td><td style={tdStyle}>Clinical context; determines whether guardian consent applies</td><td style={tdStyle}>Yes</td></tr>
              <tr><td style={tdStyle}>Location (city/country)</td><td style={tdStyle}>Regional context for AI triage</td><td style={tdStyle}>No</td></tr>
              <tr><td style={tdStyle}>Guardian email</td><td style={tdStyle}>Only collected if you're under 16 — see Section 5</td><td style={tdStyle}>Conditional</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: "16px", marginBottom: "6px", fontWeight: "700", color: C.charcoal }}>Symptom check data</p>
          <p>
            Cycle and bleeding data, pain level, selected symptoms, free-text notes, and the AI's
            triage result are stored as your health history. We do <strong>not</strong> collect
            national ID numbers, phone numbers, photographs, biometric data, or precise GPS
            coordinates.
          </p>
        </Section>

        <Section title="3. Legal Basis for Processing">
          <p style={{ marginBottom: "8px" }}>Depending on what you're doing on SisterCircle+, we rely on:</p>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li><strong>Consent</strong> — you agreeing to these Terms when you register</li>
            <li><strong>Legitimate interest</strong> — improving triage accuracy for underserved populations</li>
            <li><strong>Vital interest</strong> — an urgent triage result may be necessary to protect your health or safety, which is why triage access is never delayed by a pending guardian-consent decision for under-16 users (see Section 5)</li>
          </ul>
          <p style={{ marginTop: "10px" }}>
            We aim to comply with Kenya's Data Protection Act 2019, Uganda's Data Protection and
            Privacy Act 2019, and to align with GDPR principles for users in regions where it
            applies.
          </p>
        </Section>

        <Section title="4. How Your Data Is Used">
          <p>
            Symptom data is sent to Anthropic's Claude API to generate your triage result — never
            your name, email, user ID, or IP address, only the clinical data itself. If you're a
            CHW's patient or your case is flagged for a subscribed doctor's referral inbox, that
            doctor sees your clinical picture but never your name, email, or identity — see Section
            8 of our SECURITY.md for the technical detail.
          </p>
        </Section>

        <Section title="5. Users Under 16 — Guardian Consent">
          <p style={{ marginBottom: "10px" }}>
            If you register as under 16, we ask for a parent or guardian's email and send them a
            consent request. We chose 16 as a single global threshold — it's the default under
            GDPR (Article 8) and stricter than most other frameworks, so meeting it tends to satisfy
            lighter regimes too.
          </p>
          <p>
            You get full, immediate access to triage support regardless of whether your guardian
            has responded yet — we don't think a young person in a health-related moment of need
            should wait on an email. If your guardian declines, or doesn't respond, we may
            restrict longer-term account features and will reach out about your account's status;
            we won't silently keep processing your data indefinitely without addressing it.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <table style={tableStyle}>
            <thead><tr><th style={thStyle}>Data</th><th style={thStyle}>Retention</th></tr></thead>
            <tbody>
              <tr><td style={tdStyle}>Active account & symptom history</td><td style={tdStyle}>Indefinitely, until you delete your account</td></tr>
              <tr><td style={tdStyle}>After account deletion</td><td style={tdStyle}>Immediate and permanent — no recovery window</td></tr>
              <tr><td style={tdStyle}>Server logs</td><td style={tdStyle}>14 days, then purged; never contain symptom text or AI responses</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="7. Your Rights">
          <p style={{ marginBottom: "10px" }}>Wherever you are, you can:</p>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li><strong>Access your data</strong> — download everything we hold about you from Account Settings ("Export My Data"), or via <code>GET /api/user/export/</code></li>
            <li><strong>Delete your data</strong> — permanently and immediately, from Account Settings ("Delete My Account"), or via <code>DELETE /api/user/delete/</code></li>
            <li><strong>Correct your data</strong> — update your profile details directly, or contact us for anything not self-editable</li>
            <li><strong>Object or withdraw consent</strong> — contact us at privacy@sistercircleplus.com</li>
          </ul>
          <p style={{ marginTop: "10px" }}>
            If you can't access your account, email <strong>privacy@sistercircleplus.com</strong> with
            the email address on the account; we'll respond within 14 days.
          </p>
        </Section>

        <Section title="8. Who We Share Data With">
          <table style={tableStyle}>
            <thead><tr><th style={thStyle}>Service</th><th style={thStyle}>What's shared</th></tr></thead>
            <tbody>
              <tr><td style={tdStyle}>Anthropic (Claude API)</td><td style={tdStyle}>Clinical symptom data only, no PII</td></tr>
              <tr><td style={tdStyle}>Paystack</td><td style={tdStyle}>Payment processing — we never see your full card details</td></tr>
              <tr><td style={tdStyle}>Sentry</td><td style={tdStyle}>Error reports, with personal data and code-level variables excluded</td></tr>
              <tr><td style={tdStyle}>Render / Vercel</td><td style={tdStyle}>Hosting infrastructure, encrypted in transit</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: "10px" }}>
            We do not use advertising networks, social media pixels, or analytics services that
            share your data with third parties, and we never sell your data.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            Passwords are hashed, never stored in plain text. All traffic is encrypted in transit.
            Full technical detail — including our rate-limiting, logging, and access-control
            practices — is documented publicly in our SECURITY.md.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We'll update the "Effective" date above when this policy changes materially, and where
            practical, notify you directly for changes that affect how we use data you've already
            given us.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Data and privacy questions: <strong>privacy@sistercircleplus.com</strong>. Security
            vulnerabilities: <strong>security@sistercircleplus.com</strong>.
          </p>
        </Section>

        <p style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "48px" }}>
          © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
        </p>
      </div>
    </div>
  );
}
