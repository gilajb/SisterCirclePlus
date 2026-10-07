import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { CenteredCard } from "@/components/layout/centered-card";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";

export const TIER_LABELS = {
  solo: "Solo Practitioner",
  clinic: "Clinic (2–10)",
  hospital: "Hospital / Network",
};

export const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  past_due: "Past Due",
  cancelled: "Cancelled",
};

/** Shown when the user has no active DoctorSubscription. */
export function SubscriptionGate({ subscription }) {
  const notSubscribed = !subscription?.has_subscription;
  const tier = TIER_LABELS[subscription?.tier] || subscription?.tier;
  const status = STATUS_LABELS[subscription?.status] || subscription?.status;

  return (
    <CenteredCard className="gap-4 py-10">
      <Stethoscope className="mx-auto size-9 text-plum" aria-hidden="true" />
      <h1 className="font-heading text-lg font-bold">
        {notSubscribed
          ? "Doctor Portal access requires a subscription"
          : "Your subscription isn't active"}
      </h1>
      <p className="text-sm leading-relaxed text-body">
        {notSubscribed
          ? "Subscribe as a Solo Practitioner, Clinic, or Hospital/Network to unlock the referral inbox."
          : `Your ${tier} subscription is currently ${status}. Please update your billing to regain access.`}
      </p>
      <Button asChild variant="mauve" size="xl" className="w-full text-sm">
        <Link href="/pricing">
          View Pricing <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </CenteredCard>
  );
}

/**
 * Shown instead of SubscriptionGate right after a Paystack redirect, while the
 * webhook that actually activates the subscription is still in flight. Without
 * this, a doctor who just paid would land here and see "you need to subscribe" —
 * indistinguishable from a failed payment.
 */
export function PaymentProcessing() {
  return (
    <CenteredCard className="gap-4 py-10">
      <Spinner className="mx-auto size-8 border-[3px] text-mauve" />
      <h1 className="font-heading text-lg font-bold">Confirming your payment…</h1>
      <p className="text-sm leading-relaxed text-body">
        Paystack confirmed your payment — we're just waiting on the activation to land. This usually
        takes a few seconds.
      </p>
    </CenteredCard>
  );
}
