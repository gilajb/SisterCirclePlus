import Link from "next/link";
import { Section } from "@/components/shared/prose";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <h1 className="font-heading mb-2 text-[32px] font-extrabold">Terms of Service</h1>
      <p className="text-muted-foreground mb-10 text-[13px]">
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
          Terms and to our <Link href="/privacy" className="text-mauve underline">Privacy Policy</Link>. If
          you are registering on behalf of someone under 16, see Section 4 (Age and Guardian
          Consent) — your acceptance alone is not sufficient for that account.
        </p>
      </Section>

      <Section title="3. What the Service Is — and Is Not">
        <p className="mb-2.5">
          SisterCircle+ provides AI-generated triage guidance (a "risk tier" of monitor, refer, or
          urgent, plus possible conditions and next steps) based on symptoms you report yourself.
        </p>
        <p className="text-foreground font-bold">
          This is informational and triage-support only. It is not medical advice, diagnosis, or
          treatment, and it does not create a doctor-patient relationship — including when a
          subscribed doctor views your case through our referral system. Always seek the advice
          of a qualified healthcare provider for any medical concern, and seek emergency care
          immediately if your symptoms are severe.
        </p>
      </Section>

      <Section title="4. Age and Guardian Consent">
        <p className="mb-2.5">
          You must provide your true age when registering. If you are under 16, we require a
          parent or guardian's email address, and we will email them to request their consent.
        </p>
        <p>
          Your access to triage support is <strong>not</strong> delayed while we wait for that
          response — we rely on a separate legal basis (protecting your safety and wellbeing) to
          provide that support immediately, consistent with how a crisis health service would
          operate. A pending or declined guardian response may still affect longer-term account
          features and data retention; see our <Link href="/privacy" className="text-mauve underline">Privacy
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
        <p className="mb-2">You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>Use the Service to submit another person's health information without their knowledge, except in a genuine CHW/guardian capacity</li>
          <li>Attempt to bypass rate limits, access controls, or other technical protections</li>
          <li>Use automated tools to scrape, flood, or abuse the Service or its AI triage feature</li>
          <li>Impersonate another person or misrepresent your affiliation with an institution or clinic</li>
        </ul>
      </Section>

      <Section title="10. Disclaimers and Limitation of Liability">
        <p className="mb-2.5">
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
    </>
  );
}
