import { Suspense } from "react";
import { CenteredCard } from "@/components/layout/centered-card";
import { Wordmark } from "@/components/shared/wordmark";
import { VerifyEmail } from "@/features/auth/verify-email";

export const metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <CenteredCard>
      <Wordmark className="mb-2.5" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Verifying your email…</p>}>
        <VerifyEmail />
      </Suspense>
    </CenteredCard>
  );
}
