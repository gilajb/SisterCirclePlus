"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { PortalShell } from "@/components/layout/portal-shell";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { CaseCard } from "./case-card";
import { PaymentProcessing, STATUS_LABELS, SubscriptionGate, TIER_LABELS } from "./gates";

const MAX_PAYMENT_POLL_ATTEMPTS = 8; // ~24s at 3s intervals

const NAV = [
  { icon: ClipboardList, label: "Referral Inbox", href: "/doctor-portal", active: true },
];

/**
 * Tracks the doctor's subscription. After a Paystack redirect (a reference in
 * the URL) it re-checks every 3 seconds until the webhook has activated it.
 */
function useSubscription() {
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
  const [subscription, setSubscription] = useState(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/billing/doctor-subscription/")
      .then((res) => res.data)
      .catch(() => ({ has_subscription: false }))
      .then((data) => !cancelled && setSubscription(data));
    return () => {
      cancelled = true;
    };
  }, [pollAttempts]);

  const isActive = Boolean(subscription?.has_subscription && subscription.status === "active");
  // Only poll if we arrived from an actual Paystack redirect — never for someone
  // who just navigates here without having paid.
  const isPolling =
    Boolean(paymentReference) &&
    subscription !== null &&
    !isActive &&
    pollAttempts < MAX_PAYMENT_POLL_ATTEMPTS;

  useEffect(() => {
    if (!isPolling) return;
    const timer = setTimeout(() => setPollAttempts((n) => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [isPolling, pollAttempts]);

  return { subscription, isActive, isPolling };
}

function Stat({ value, label, className }) {
  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <p className="font-heading text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

function Inbox() {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/doctor/referrals/")
      .then((res) => {
        if (cancelled) return;
        setCases(res.data.results);
        setTotal(res.data.count);
        setNextPageUrl(res.data.next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.detail ||
            "Couldn't load the referral inbox right now. Please try again shortly.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      // `next` is already an absolute URL from DRF's pagination — axios uses it
      // as-is rather than joining it with the api client's baseURL.
      const { data } = await api.get(nextPageUrl);
      setCases((prev) => [...prev, ...data.results]);
      setNextPageUrl(data.next);
    } catch {
      setError("Couldn't load more cases right now. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** Runs one case action, tracking which card is busy and surfacing failures. */
  async function act(id, request, onSuccess, failureMessage) {
    setError("");
    setActingId(id);
    try {
      onSuccess(await request());
    } catch (err) {
      if (err.response?.status === 409) {
        // No longer in this doctor's view of the shared pool
        setCases((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => t - 1);
        setError("This case was just claimed by another provider.");
      } else {
        setError(failureMessage);
      }
    } finally {
      setActingId(null);
    }
  }

  const replaceCase = ({ data }) =>
    setCases((prev) => prev.map((c) => (c.id === data.id ? data : c)));

  const claim = (id) =>
    act(
      id,
      () => api.post(`/api/doctor/referrals/${id}/claim/`),
      replaceCase,
      "Couldn't claim this case. Please try again.",
    );

  const release = (id) =>
    act(
      id,
      () => api.post(`/api/doctor/referrals/${id}/release/`),
      replaceCase,
      "Couldn't release this case. Please try again.",
    );

  const resolve = (id) =>
    act(
      id,
      () => api.post(`/api/doctor/referrals/${id}/resolve/`),
      () => {
        setCases((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => t - 1);
      },
      "Couldn't mark this case as resolved. Please try again.",
    );

  const urgentCount = cases.filter((c) => c.risk_tier === "urgent").length;
  const referCount = cases.filter((c) => c.risk_tier === "refer").length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat
          value={urgentCount}
          label="Urgent"
          className="border-urgent-border bg-urgent-bg text-urgent"
        />
        <Stat
          value={referCount}
          label="Refer"
          className="border-gold-border bg-refer-bg text-gold-dark"
        />
        <Stat
          value={total}
          label="Total open cases"
          className="col-span-2 bg-card md:col-span-1 [&>p:last-child]:text-muted-foreground"
        />
      </div>
      {cases.length < total ? (
        <p className="-mt-3 text-xs text-muted-foreground">
          Urgent/Refer counts above reflect the {cases.length} cases loaded so far, not all {total}.
        </p>
      ) : null}

      <ErrorBanner message={error} />

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading referral inbox…</p>
      ) : cases.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No urgent or refer-tier cases right now.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {cases.map((c) => (
              <CaseCard
                key={c.id}
                submission={c}
                busy={actingId === c.id}
                onClaim={() => claim(c.id)}
                onRelease={() => release(c.id)}
                onResolve={() => resolve(c.id)}
              />
            ))}
          </div>
          {nextPageUrl ? (
            <Button
              variant="outline"
              size="xl"
              onClick={loadMore}
              disabled={loadingMore}
              className="h-11 bg-card text-sm text-mauve"
            >
              {loadingMore ? "Loading…" : `Load More Cases (${total - cases.length} remaining)`}
            </Button>
          ) : null}
        </>
      )}
    </>
  );
}

export function DoctorPortal() {
  const { subscription, isActive, isPolling } = useSubscription();

  if (subscription === null) return null;
  if (isPolling) return <PaymentProcessing />;
  if (!isActive) return <SubscriptionGate subscription={subscription} />;

  return (
    <PortalShell
      name="Doctor Portal"
      subtitle={TIER_LABELS[subscription.tier] || subscription.tier}
      nav={NAV}
      sidebarFooter={
        <span className="mb-2 rounded-full border border-gold-border bg-gold-light px-3 py-1 text-center text-[11px] font-bold text-gold-dark">
          {STATUS_LABELS[subscription.status] || subscription.status}
        </span>
      }
      title="Referral Inbox"
      description="Platform-wide cases flagged for clinical follow-up"
    >
      <Inbox />
    </PortalShell>
  );
}
