"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, KeyRound } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function GuardianConsent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const prefilledDecision = searchParams.get("decision"); // links from the email pre-select

  const [status, setStatus] = useState(uid && token ? "ready" : "missing");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvedDecision, setResolvedDecision] = useState(null);

  async function handleDecision(decision) {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/auth/guardian-consent/confirm/", {
        uid,
        token,
        decision,
      });
      setResolvedDecision(data.decision || decision);
      setStatus("done");
    } catch (err) {
      setError(flattenErrors(err));
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "missing") {
    return <ErrorBanner message="This consent link is missing its token." />;
  }

  if (status === "done") {
    return (
      <>
        <Check className="mx-auto size-8" aria-hidden="true" />
        <h1 className="font-heading text-lg font-bold">
          {resolvedDecision === "approve" ? "Consent recorded" : "Decision recorded"}
        </h1>
        <p className="text-sm text-body">
          Thank you — your response has been saved. Questions about this request can be sent to
          sistercircleplus@protonmail.com.
        </p>
      </>
    );
  }

  const hasPrefill = prefilledDecision === "approve" || prefilledDecision === "decline";

  return (
    <>
      <KeyRound className="mx-auto size-8 text-gold" aria-hidden="true" />
      <h1 className="font-heading text-lg font-bold">Guardian Consent Request</h1>
      <p className="text-sm leading-relaxed text-body">
        A SisterCircle+ account was created using your email as the parent/guardian contact for a
        young person under 16. SisterCircle+ provides confidential menstrual and reproductive health
        triage support.
      </p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        They already have access to triage support regardless of your decision here — your response
        affects their account's longer-term standing, not whether they can get help right now.
      </p>
      <ErrorBanner message={error} />
      {hasPrefill ? (
        <p className="-mt-1.5 text-xs font-semibold text-gold">
          You clicked "{prefilledDecision === "approve" ? "Approve" : "Decline"}" in the email —
          confirm below to record it.
        </p>
      ) : null}
      <div className="mt-2 flex gap-2.5">
        <Button
          variant="outline"
          size="xl"
          onClick={() => handleDecision("decline")}
          disabled={submitting}
          className={cn(
            "flex-1 rounded-lg bg-card text-sm font-semibold text-body",
            prefilledDecision === "decline" && "border-gold-border bg-gold-light",
          )}
        >
          Decline
        </Button>
        <Button
          variant={prefilledDecision === "approve" ? "default" : "mauve"}
          size="xl"
          onClick={() => handleDecision("approve")}
          disabled={submitting}
          className="flex-1 rounded-lg text-sm"
        >
          {submitting ? "Submitting…" : "Approve"}
        </Button>
      </div>
    </>
  );
}
