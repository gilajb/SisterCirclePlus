"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { billingCycleLabel, formatUsd } from "./data";
import { FeatureList } from "./feature-list";

/** Under-18 access is unlocked only by a code from a school or CHW program. */
function RedeemCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter a code.");
      return;
    }
    if (!isLoggedIn()) {
      router.push("/signup?next=pricing");
      return;
    }
    setRedeeming(true);
    try {
      await api.post("/api/billing/redeem-code/", { code: trimmed });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Couldn't redeem this code. Please check it and try again.",
      );
    } finally {
      setRedeeming(false);
    }
  }

  if (success) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-1.5 rounded-[10px] border border-success-border bg-success-bg px-4 py-3.5 text-center text-[13px] leading-normal font-semibold text-success"
      >
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Code redeemed — you now have under-18 access.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <p className="text-[13px] leading-normal text-body">
        Ask your school or CHW program for an access code, then redeem it here — this tier isn't
        available through individual sign-up.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter access code"
        aria-label="Access code"
        autoComplete="off"
        className="h-[42px] rounded-lg px-3.5 font-mono text-sm tracking-[2px]"
      />
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        size="xl"
        disabled={redeeming}
        className="h-11 rounded-lg border-gold-border bg-gold-light text-sm text-gold-dark hover:bg-gold-light/70 hover:text-gold-dark"
      >
        {redeeming ? "Redeeming…" : "Redeem Code"}
      </Button>
    </form>
  );
}

function TierCard({ tier, subscribing, onSubscribe }) {
  const isFree = tier.code === "free";
  const busy = subscribing === tier.code;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-7">
      <div>
        <h3 className="font-heading text-lg font-bold">{tier.name}</h3>
        <p className="mt-1.5 font-heading text-2xl font-extrabold text-mauve">
          {formatUsd(tier.price_min_usd, tier.price_max_usd)}
          <span className="text-[13px] font-medium text-muted-foreground">
            {" "}
            {billingCycleLabel(tier.billing_cycle)}
          </span>
        </p>
      </div>

      {tier.description ? (
        <p className="text-[13px] leading-relaxed text-body">{tier.description}</p>
      ) : null}

      <FeatureList items={tier.features || []} className="flex-1" />

      {tier.code === "under_18" ? (
        <RedeemCode />
      ) : (
        <Button
          variant={isFree ? "secondary" : "mauve"}
          size="xl"
          disabled={busy}
          onClick={() => onSubscribe(tier)}
        >
          {isFree ? "Get Started Free" : busy ? "Redirecting…" : "Subscribe"}
        </Button>
      )}
    </article>
  );
}

/**
 * User-tier cards. `initialTiers` comes from the server render; when the
 * server couldn't reach the backend it is null and the catalog is fetched in
 * the browser instead.
 */
export function UserTiers({ initialTiers }) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initialTiers ?? []);
  const [loading, setLoading] = useState(!initialTiers);
  const [error, setError] = useState("");
  const [subscribing, setSubscribing] = useState("");

  useEffect(() => {
    if (initialTiers) return;
    api
      .get("/api/billing/pricing/")
      .then((res) => setTiers(res.data))
      .catch(() => setError("Couldn't load pricing right now. Please try again shortly."))
      .finally(() => setLoading(false));
  }, [initialTiers]);

  async function handleSubscribe(tier) {
    if (tier.code === "free") {
      router.push("/signup");
      return;
    }
    if (!isLoggedIn()) {
      router.push("/signup?next=pricing");
      return;
    }
    setSubscribing(tier.code);
    try {
      const { data } = await api.post("/api/billing/checkout/", {
        tier_code: tier.code,
        callback_url: `${window.location.origin}/dashboard`,
      });
      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't start checkout. Please try again.");
      setSubscribing("");
    }
  }

  return (
    <>
      {loading ? <p className="text-sm text-muted-foreground">Loading pricing…</p> : null}
      {error ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {tiers.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <TierCard
              key={tier.code}
              tier={tier}
              subscribing={subscribing}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
