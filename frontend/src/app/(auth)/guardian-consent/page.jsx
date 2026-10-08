import { Suspense } from "react";
import { CenteredCard } from "@/components/layout/centered-card";
import { Wordmark } from "@/components/shared/wordmark";
import { GuardianConsent } from "@/features/auth/guardian-consent";

export const metadata = { title: "Guardian consent" };

export default function GuardianConsentPage() {
  return (
    <CenteredCard className="max-w-[460px] gap-4">
      <Wordmark className="mb-1.5" />
      <Suspense fallback={null}>
        <GuardianConsent />
      </Suspense>
    </CenteredCard>
  );
}
