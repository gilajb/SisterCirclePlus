"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";
import { sanitizeSymptomPayload } from "@/lib/sanitize";
import { BasicsStep, CycleStep, ReviewStep, STEPS, SymptomsStep } from "./steps";

/** Results are handed to /results through sessionStorage under this key. */
export const RESULT_STORAGE_KEY = "sistercircle_result";

const INITIAL_FORM = {
  age: "",
  location: "",
  userType: "Patient",
  lastPeriod: "",
  cycleLength: "Average",
  cycleRegularity: "",
  bleedingVolume: "",
  bleedingDays: "",
  painLevel: 5,
  symptoms: [],
  otherSymptoms: "",
};

const STEP_COMPONENTS = [BasicsStep, CycleStep, SymptomsStep, ReviewStep];

export function SymptomCheck() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const isLast = step === STEPS.length;
  const progress = (step / STEPS.length) * 100;
  const stepInfo = STEPS[step - 1];
  const StepFields = STEP_COMPONENTS[step - 1];

  function goBack() {
    setSubmitError("");
    setStep((s) => s - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    if (!isLast) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/symptoms/analyse/", sanitizeSymptomPayload(form));
      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setSubmitError(
        flattenErrors(
          err,
          err.response
            ? "Analysis failed. Please try again."
            : "Analysis failed. Please check your connection and try again.",
        ),
      );
      setLoading(false);
    }
  }

  const submitLabel = loading ? (
    <>
      <Spinner /> Analysing…
    </>
  ) : isLast ? (
    <>
      Analyse My Symptoms <Sparkles aria-hidden="true" />
    </>
  ) : (
    <>
      Continue <ArrowRight aria-hidden="true" />
    </>
  );

  return (
    <div className="min-h-screen">
      <AppHeader
        mobileStart={
          <button
            type="button"
            onClick={() => (step > 1 ? goBack() : router.push("/dashboard"))}
            aria-label={step > 1 ? "Previous step" : "Close symptom check"}
            className="flex size-11 cursor-pointer items-center justify-center"
          >
            {step > 1 ? <ArrowLeft className="size-5" /> : <X className="size-5" />}
          </button>
        }
      />

      <div className="hidden px-12 pt-10 pb-5 text-center md:block">
        <h1 className="mb-3 font-heading text-4xl font-extrabold text-mauve">Symptom Assessment</h1>
        <p className="text-base text-muted-foreground italic">
          "We're listening. Tell us more about your experience."
        </p>
      </div>

      <main className="mx-auto max-w-[720px] px-5 pt-5 pb-28 md:px-12 md:pt-8 md:pb-[60px]">
        <div className="mb-6 md:mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-[0.5px] text-plum uppercase">
              Step {step} of {STEPS.length}
              <span className="md:hidden"> — {stepInfo.label}</span>
            </span>
            <span className="text-[13px] text-muted-foreground">{progress}% Complete</span>
          </div>
          <div
            role="progressbar"
            aria-label="Assessment progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-[5px] overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-plum transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-7">
          <h2 className="mb-2 font-heading text-[26px] font-extrabold md:text-[22px]">
            {stepInfo.title}
          </h2>
          <p className="text-sm leading-relaxed text-body">{stepInfo.sub}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:rounded-2xl md:border md:bg-card md:p-9"
          noValidate
        >
          <div className="flex flex-col gap-6">
            <StepFields form={form} set={set} />
            {isLast ? <ErrorBanner message={submitError} /> : null}
          </div>

          {/* Actions: inline on desktop, fixed to the bottom of the screen on phones. */}
          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t bg-card px-5 py-4 md:static md:mt-8 md:justify-end md:border-0 md:bg-transparent md:p-0">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="xl"
                onClick={goBack}
                disabled={loading}
                aria-label="Back"
                className="size-[52px] rounded-[10px] bg-transparent px-0 md:mr-auto md:h-12 md:w-auto md:rounded-lg md:px-7 md:font-semibold"
              >
                <ArrowLeft aria-hidden="true" />
                <span className="hidden md:inline">Back</span>
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="plum"
              size="xl"
              disabled={loading}
              className="h-[52px] flex-1 font-semibold md:h-12 md:flex-none md:rounded-lg md:px-8"
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </main>

      <AppFooter />
    </div>
  );
}
