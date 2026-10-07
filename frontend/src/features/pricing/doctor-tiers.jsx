"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { DOCTOR_TIERS } from "./data";
import { FeatureList } from "./feature-list";

export function DoctorTiers() {
  const router = useRouter();
  const countId = useId();
  const [subscribing, setSubscribing] = useState("");
  const [error, setError] = useState("");
  const [practitionerCount, setPractitionerCount] = useState(2);

  async function handleSubscribe(tier) {
    if (!isLoggedIn()) {
      router.push("/signup?next=pricing");
      return;
    }
    setError("");
    setSubscribing(tier.key);
    try {
      const { data } = await api.post("/api/billing/doctor-checkout/", {
        tier: tier.key,
        ...(tier.needsPractitionerCount && { practitioner_count: practitionerCount }),
        callback_url: `${window.location.origin}/doctor-portal`,
      });
      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't start checkout. Please try again.");
      setSubscribing("");
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="text-danger mb-4 text-[13px]">
          {error}
        </p>
      ) : null}
      <div className="grid gap-5 md:grid-cols-3">
        {DOCTOR_TIERS.map((tier) => (
          <article key={tier.key} className="bg-card flex flex-col gap-3.5 rounded-2xl border p-6">
            <div>
              <h3 className="font-heading text-base font-bold">{tier.name}</h3>
              <p className="font-heading text-mauve mt-1.5 mb-3.5 text-lg font-extrabold">
                {tier.price}
                {tier.priceNote ? (
                  <span className="text-muted-foreground text-xs font-medium"> {tier.priceNote}</span>
                ) : null}
              </p>
              <FeatureList items={tier.includes} className="gap-2" />
            </div>

            {tier.needsPractitionerCount ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={countId} className="text-xs">
                  Number of practitioners
                </Label>
                <Input
                  id={countId}
                  type="number"
                  min={2}
                  max={10}
                  value={practitionerCount}
                  onChange={(e) =>
                    setPractitionerCount(Math.min(10, Math.max(2, Number(e.target.value) || 2)))
                  }
                  className="h-10 rounded-lg px-3 text-sm"
                />
              </div>
            ) : null}

            {tier.selfServe ? (
              <Button
                variant="mauve"
                size="xl"
                disabled={subscribing === tier.key}
                onClick={() => handleSubscribe(tier)}
                className="mt-auto h-11 text-sm"
              >
                {subscribing === tier.key ? "Redirecting…" : "Subscribe"}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-gold-border bg-gold-light text-gold-dark hover:bg-gold-light/70 hover:text-gold-dark mt-auto h-11 text-sm"
              >
                <a href="#institutional-lead">Contact Sales</a>
              </Button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
