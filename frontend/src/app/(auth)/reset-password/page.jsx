import { Suspense } from "react";
import { CenteredCard } from "@/components/layout/centered-card";
import { Wordmark } from "@/components/shared/wordmark";
import { ResetPassword } from "@/features/auth/reset-password";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <CenteredCard className="gap-0 text-left">
      <Wordmark className="mb-6" />
      <Suspense fallback={null}>
        <ResetPassword />
      </Suspense>
    </CenteredCard>
  );
}
