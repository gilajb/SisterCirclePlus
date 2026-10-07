import { Section, Table, Td, Th } from "@/components/shared/prose";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="font-heading mb-2 text-[32px] font-extrabold">Privacy Policy</h1>
      <p className="text-muted-foreground mb-10 text-[13px]">
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
        <p className="text-foreground mb-1.5 font-bold">Account data</p>
        <Table>
          <thead><tr><Th>Field</Th><Th>Why</Th><Th>Required</Th></tr></thead>
          <tbody>
            <tr><Td>Username, email, password</Td><Td>Login and account recovery</Td><Td>Yes</Td></tr>
            <tr><Td>Age</Td><Td>Clinical context; determines whether guardian consent applies</Td><Td>Yes</Td></tr>
            <tr><Td>Location (city/country)</Td><Td>Regional context for AI triage</Td><Td>No</Td></tr>
            <tr><Td>Guardian email</Td><Td>Only collected if you're under 16 — see Section 5</Td><Td>Conditional</Td></tr>
          </tbody>
        </Table>
        <p className="text-foreground mt-4 mb-1.5 font-bold">Symptom check data</p>
        <p>
          Cycle and bleeding data, pain level, selected symptoms, free-text notes, and the AI's
          triage result are stored as your health history. We do <strong>not</strong> collect
          national ID numbers, phone numbers, photographs, biometric data, or precise GPS
          coordinates.
        </p>
      </Section>

      <Section title="3. Legal Basis for Processing">
        <p className="mb-2">Depending on what you're doing on SisterCircle+, we rely on:</p>
        <ul className="list-disc pl-5">
          <li><strong>Consent</strong> — you agreeing to these Terms when you register</li>
          <li><strong>Legitimate interest</strong> — improving triage accuracy for underserved populations</li>
          <li><strong>Vital interest</strong> — an urgent triage result may be necessary to protect your health or safety, which is why triage access is never delayed by a pending guardian-consent decision for under-16 users (see Section 5)</li>
        </ul>
        <p className="mt-2.5">
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
        <p className="mb-2.5">
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
        <Table>
          <thead><tr><Th>Data</Th><Th>Retention</Th></tr></thead>
          <tbody>
            <tr><Td>Active account & symptom history</Td><Td>Indefinitely, until you delete your account</Td></tr>
            <tr><Td>After account deletion</Td><Td>Immediate and permanent — no recovery window</Td></tr>
            <tr><Td>Server logs</Td><Td>14 days, then purged; never contain symptom text or AI responses</Td></tr>
          </tbody>
        </Table>
      </Section>

      <Section title="7. Your Rights">
        <p className="mb-2.5">Wherever you are, you can:</p>
        <ul className="list-disc pl-5">
          <li><strong>Access your data</strong> — download everything we hold about you from Account Settings ("Export My Data"), or via <code className="font-mono text-[13px]">GET /api/user/export/</code></li>
          <li><strong>Delete your data</strong> — permanently and immediately, from Account Settings ("Delete My Account"), or via <code className="font-mono text-[13px]">DELETE /api/user/delete/</code></li>
          <li><strong>Correct your data</strong> — update your profile details directly, or contact us for anything not self-editable</li>
          <li><strong>Object or withdraw consent</strong> — contact us at sistercircleplus@protonmail.com</li>
        </ul>
        <p className="mt-2.5">
          If you can't access your account, email <strong>sistercircleplus@protonmail.com</strong> with
          the email address on the account; we'll respond within 14 days.
        </p>
      </Section>

      <Section title="8. Who We Share Data With">
        <Table>
          <thead><tr><Th>Service</Th><Th>What's shared</Th></tr></thead>
          <tbody>
            <tr><Td>Anthropic (Claude API)</Td><Td>Clinical symptom data only, no PII</Td></tr>
            <tr><Td>Paystack</Td><Td>Payment processing — we never see your full card details</Td></tr>
            <tr><Td>Sentry</Td><Td>Error reports, with personal data and code-level variables excluded</Td></tr>
            <tr><Td>Render / Vercel</Td><Td>Hosting infrastructure, encrypted in transit</Td></tr>
          </tbody>
        </Table>
        <p className="mt-2.5">
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
          Data and privacy questions: <strong>sistercircleplus@protonmail.com</strong>. Security
          vulnerabilities: <strong>sistercircleplus@protonmail.com</strong>.
        </p>
      </Section>
    </>
  );
}
