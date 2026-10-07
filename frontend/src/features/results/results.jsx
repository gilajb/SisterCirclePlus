"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Download,
  HeartHandshake,
  ListChecks,
} from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { RESULT_STORAGE_KEY } from "@/features/symptom-check/symptom-check";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConditionCard } from "./condition-card";
import { downloadReport, riskConfig } from "./risk";

/**
 * Loads the result to display. Two sources: a submission id in the URL
 * (a past result opened from Dashboard history) or sessionStorage (the
 * symptom check that was just completed).
 */
function useResult() {
  const router = useRouter();
  const historicalId = useSearchParams().get("id");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (historicalId) {
        try {
          const { data: s } = await api.get(`/api/symptoms/${historicalId}/`);
          if (cancelled) return;
          setResult({
            submission_id: s.id,
            risk_tier: s.risk_tier,
            conditions: s.ai_result?.conditions ?? [],
            next_steps: s.ai_result?.next_steps ?? [],
            team_note: s.ai_result?.team_note ?? "",
          });
        } catch {
          if (!cancelled) router.replace("/dashboard");
        }
        return;
      }

      try {
        const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
        if (!raw) throw new Error("no result");
        setResult(JSON.parse(raw));
      } catch {
        router.replace("/symptom-check");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [historicalId, router]);

  return { result, isHistorical: Boolean(historicalId) };
}

export function Results() {
  const router = useRouter();
  const { result, isHistorical } = useResult();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      await api.post("/api/symptoms/save/", { submission_id: result?.submission_id ?? null });
      setSaved(true);
      // Brief pause so the user sees the confirmation, then navigate
      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      setSaveError("Could not save to dashboard. Please try again.");
      setSaving(false);
    }
  }

  if (!result) return null;

  const risk = riskConfig(result.risk_tier);
  const RiskIcon = risk.icon;
  const conditions = result.conditions ?? [];
  const nextSteps = result.next_steps ?? [];
  const teamNote = result.team_note ?? "";

  // The primary action: back to the dashboard for a past result, save for a new one.
  const primaryAction = (className, shortLabel) =>
    isHistorical ? (
      <Button asChild size="xl" className={cn("bg-foreground hover:bg-foreground/85", className)}>
        <Link href="/dashboard">
          <ArrowLeft aria-hidden="true" /> Back to Dashboard
        </Link>
      </Button>
    ) : (
      <Button
        size="xl"
        onClick={handleSave}
        disabled={saving || saved}
        className={cn(
          "bg-foreground hover:bg-foreground/85 disabled:opacity-100",
          saved && "bg-success",
          className
        )}
      >
        {saved ? (
          <>
            <Check aria-hidden="true" /> Saved!
          </>
        ) : saving ? (
          <>
            <Spinner /> Saving…
          </>
        ) : (
          shortLabel
        )}
      </Button>
    );

  return (
    <div className="min-h-screen">
      <AppHeader
        mobileTitle={<span className="text-mauve">Analysis</span>}
        mobileStart={
          <Link
            href={isHistorical ? "/dashboard" : "/symptom-check"}
            aria-label="Back"
            className="flex size-11 items-center justify-center"
          >
            <ArrowLeft className="size-5" />
          </Link>
        }
        mobileEnd={
          <button
            type="button"
            onClick={() => downloadReport(result)}
            aria-label="Download report"
            className="flex size-11 cursor-pointer items-center justify-center"
          >
            <Download className="size-5" />
          </button>
        }
      />

      <main className="mx-auto max-w-[1100px] px-5 pt-6 pb-28 md:px-12 md:pt-10 md:pb-[60px]">
        {/* Risk banner */}
        <section
          className={cn(
            "mb-6 flex flex-col gap-4 rounded-xl border border-l-4 p-5 md:mb-10 md:flex-row md:items-center md:justify-between md:px-7 md:py-6",
            risk.banner
          )}
        >
          <div className="flex flex-col gap-1.5">
            <p
              className={cn(
                "flex items-center gap-2 text-[11px] font-bold tracking-[1.2px] uppercase",
                risk.text
              )}
            >
              <RiskIcon className="size-4" aria-hidden="true" />
              {risk.label}
            </p>
            <h1 className={cn("font-heading text-[26px] font-extrabold md:text-[28px]", risk.text)}>
              {risk.title}
            </h1>
            <p className="text-body text-[15px]">{risk.subtitle}</p>
          </div>
          <div className="hidden shrink-0 gap-3 md:flex">
            <Button
              variant="outline"
              size="xl"
              onClick={() => downloadReport(result)}
              className="bg-card h-11 rounded-lg px-5 text-sm font-semibold"
            >
              <Download aria-hidden="true" /> Report
            </Button>
            {primaryAction(
              "h-11 min-w-[220px] rounded-lg px-5 text-sm font-semibold",
              "Save to My Health Dashboard"
            )}
          </div>
          {saveError ? (
            <p role="alert" className="text-danger text-[13px]">
              {saveError}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col items-start gap-7 md:flex-row">
          {/* Conditions */}
          <section className="flex w-full flex-1 flex-col gap-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-muted-foreground md:font-heading md:text-foreground text-[11px] font-bold tracking-[1px] uppercase md:text-xl md:tracking-normal md:normal-case">
                <span className="md:hidden">Potential indicators</span>
                <span className="hidden md:inline">Potential Insights</span>
              </h2>
              <span className="text-primary text-[13px] font-semibold md:hidden">
                {conditions.length} Result{conditions.length !== 1 ? "s" : ""} Found
              </span>
              <ClipboardList
                className="text-muted-foreground hidden size-[18px] md:block"
                aria-hidden="true"
              />
            </div>
            {conditions.map((condition, i) => (
              <ConditionCard key={condition.name + i} condition={condition} index={i} />
            ))}
          </section>

          {/* What to do next */}
          {nextSteps.length > 0 ? (
            <section className="bg-pink-pale md:border-gold-border md:bg-gold-light flex w-full flex-col gap-4 rounded-2xl p-6 md:w-80 md:shrink-0 md:gap-5 md:border md:p-7">
              <h2 className="font-heading text-mauve md:text-foreground flex items-center gap-2.5 text-lg font-bold">
                <ListChecks className="hidden size-[18px] md:block" aria-hidden="true" />
                <span className="md:hidden">Next Steps</span>
                <span className="hidden md:inline">What to do next</span>
              </h2>
              <ol className="flex flex-col gap-2.5 md:gap-5">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 md:gap-3.5">
                    <span
                      aria-hidden="true"
                      className="text-mauve md:text-muted-foreground mt-px min-w-4 text-[13px] font-bold"
                    >
                      {i + 1}
                    </span>
                    <span className="text-body text-sm leading-relaxed md:text-[13px]">{step}</span>
                  </li>
                ))}
              </ol>
              {/* No booking flow exists yet, so this is disabled until one does. */}
              <Button
                size="xl"
                disabled
                className="bg-foreground mt-1 hidden text-sm font-semibold md:inline-flex"
              >
                Book Tele-health Consultation <ArrowRight aria-hidden="true" />
              </Button>
            </section>
          ) : null}
        </div>

        {/* Team note */}
        {teamNote ? (
          <section className="bg-card mt-6 flex flex-col rounded-xl border p-5 md:mt-12 md:flex-row md:items-center md:gap-12 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <div className="flex-1">
              <h2 className="font-heading text-mauve md:text-foreground mb-2.5 text-base font-bold md:mb-4 md:text-2xl">
                A note from your SisterCircle+ team
              </h2>
              <p className="text-body text-sm leading-[1.7] md:text-[15px] md:leading-[1.75]">
                {teamNote}
              </p>
            </div>
            {/* Placeholder until support photography is available. */}
            <div
              aria-hidden="true"
              className="hidden h-[200px] w-[360px] shrink-0 items-center justify-center rounded-2xl bg-linear-135 from-[#8a7060] to-[#c4a882] md:flex"
            >
              <HeartHandshake className="size-12 text-white/70" />
            </div>
          </section>
        ) : null}

        <p className="text-muted-foreground mx-auto mt-6 max-w-[600px] text-center text-xs leading-relaxed italic md:mt-12">
          Disclaimer: This AI-generated analysis is intended for informational purposes only and
          does not constitute medical advice, diagnosis, or treatment. Always seek the advice of
          your physician or other qualified health providers with any questions you may have
          regarding a medical condition.
        </p>
      </main>

      <AppFooter />

      {/* Actions fixed to the bottom of the screen — phones only */}
      <div className="bg-card fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t px-5 py-4 md:hidden">
        {saveError ? (
          <p role="alert" className="text-danger text-center text-xs">
            {saveError}
          </p>
        ) : null}
        <div className="flex gap-3">
          {primaryAction(
            "h-[52px] flex-1 font-semibold",
            <>
              <ClipboardList aria-hidden="true" /> Save to Dashboard
            </>
          )}
          <Button
            variant="outline"
            size="xl"
            onClick={() => downloadReport(result)}
            aria-label="Download report"
            className="border-mauve bg-card text-mauve size-[52px] border-[1.5px] px-0"
          >
            <Download aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
