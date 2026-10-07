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

export default function TermsPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ padding: "24px 48px", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/" style={{ fontSize: "18px", fontWeight: "700", color: C.pink, fontFamily: "Georgia, serif", textDecoration: "none" }}>SisterCircle+</Link>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 96px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: C.charcoal, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>Terms of Service</h1>
        <p style={{ fontSize: "13px", color: C.muted, fontFamily: "system-ui, sans-serif", margin: "0 0 40px" }}>
          Version 1.0 — Effective July 2026 — SisterCirclePlus
        </p>

        <Section title="1. Who We Are">
          <p>
            SisterCirclePlus ("SisterCircle+", "we", "us") is a business name registered to provide
            AI-assisted menstrual and reproductive health triage support, primarily serving Kenya
            and expanding across Africa, with the app accessible to users globally. These Terms
            govern your use of the SisterCircle+ website, mobile-web app, and related services
            (together, the "Service").
          </p>
        </Section>

        <Section title="2. Acceptance of These Terms">
          <p>
            By creating an account, you confirm that you have read, understood, and agree to these
            Terms and to our <Link to="/privacy" style={{ color: C.mauve }}>Privacy Policy</Link>. If
            you are registering on behalf of someone under 16, see Section 4 (Age and Guardian
            Consent) — your acceptance alone is not sufficient for that account.
          </p>
        </Section>

        <Section title="3. What the Service Is — and Is Not">
          <p style={{ marginBottom: "10px" }}>
            SisterCircle+ provides AI-generated triage guidance (a "risk tier" of monitor, refer, or
            urgent, plus possible conditions and next steps) based on symptoms you report yourself.
          </p>
          <p style={{ fontWeight: "700", color: C.charcoal }}>
            This is informational and triage-support only. It is not medical advice, diagnosis, or
            treatment, and it does not create a doctor-patient relationship — including when a
            subscribed doctor views your case through our referral system. Always seek the advice
            of a qualified healthcare provider for any medical concern, and seek emergency care
            immediately if your symptoms are severe.
          </p>
        </Section>

        <Section title="4. Age and Guardian Consent">
          <p style={{ marginBottom: "10px" }}>
            You must provide your true age when registering. If you are under 16, we require a
            parent or guardian's email address, and we will email them to request their consent.
          </p>
          <p>
            Your access to triage support is <strong>not</strong> delayed while we wait for that
            response — we rely on a separate legal basis (protecting your safety and wellbeing) to
            provide that support immediately, consistent with how a crisis health service would
            operate. A pending or declined guardian response may still affect longer-term account
            features and data retention; see our <Link to="/privacy" style={{ color: C.mauve }}>Privacy
            Policy</Link> for details.
          </p>
        </Section>

        <Section title="5. Your Account">
          <p>
            You're responsible for keeping your login credentials confidential and for all activity
            under your account. Tell us immediately if you believe your account has been
            compromised. You may delete your account at any time from Account Settings — see our
            Privacy Policy for what that does and doesn't remove.
          </p>
        </Section>

        <Section title="6. Community Health Worker (CHW) and Institutional Access">
          <p>
            CHWs and institutional partners may generate time-limited access codes for the people
            they serve, unlocking discounted access. If you received a code from a CHW or program,
            that organization is responsible for explaining this Service to you before you use it.
          </p>
        </Section>

        <Section title="7. Doctor and Clinic Subscriptions">
          <p>
            Doctors and clinics may subscribe to view a shared inbox of cases flagged for clinical
            follow-up. This is a professional tool for licensed practitioners; subscribing does not
            make SisterCircle+ your employer, and we are not a party to any care a subscribing
            doctor provides. See Section 3 above — nothing in this flow constitutes SisterCircle+
            practicing medicine.
          </p>
        </Section>

        <Section title="8. Payments">
          <p>
            Paid tiers are billed through our payment processor (Paystack); we never receive or
            store your full card details. Subscription pricing and billing cycles are shown before
            you pay. Fees are non-refundable except where required by law.
          </p>
        </Section>

        <Section title="9. Acceptable Use">
          <p style={{ marginBottom: "8px" }}>You agree not to:</p>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li>Use the Service to submit another person's health information without their knowledge, except in a genuine CHW/guardian capacity</li>
            <li>Attempt to bypass rate limits, access controls, or other technical protections</li>
            <li>Use automated tools to scrape, flood, or abuse the Service or its AI triage feature</li>
            <li>Impersonate another person or misrepresent your affiliation with an institution or clinic</li>
          </ul>
        </Section>

        <Section title="10. Disclaimers and Limitation of Liability">
          <p style={{ marginBottom: "10px" }}>
            The Service is provided "as is." AI-generated triage output can be wrong — see Section
            3. To the fullest extent permitted by applicable law, SisterCircle+ is not liable for
            indirect, incidental, or consequential damages arising from your use of the Service.
            Nothing in these Terms limits liability that cannot be limited under the law that
            applies to you.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these Terms as the Service evolves. Material changes will be reflected in
            the "Effective" date above; continued use after a change means you accept the updated
            Terms.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of Kenya, without regard to conflict-of-law
            principles. This does not remove any consumer-protection rights you have under the
            mandatory law of your own country of residence, where applicable.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Questions about these Terms: <strong>sistercircleplus@protonmail.com</strong>. Security
            concerns: <strong>sistercircleplus@protonmail.com</strong>. Privacy/data requests:{" "}
            <strong>sistercircleplus@protonmail.com</strong>.
          </p>
        </Section>

        <p style={{ fontSize: "12px", color: C.muted, fontFamily: "system-ui, sans-serif", marginTop: "48px" }}>
          © 2026 SisterCircle+. Medical Clarity through Clinical Warmth.
        </p>
      </div>
    </div>
  );
}
