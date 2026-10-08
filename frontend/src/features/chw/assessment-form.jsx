"use client";

import { useId, useState } from "react";
import { ClipboardPlus, Plus, X } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Field } from "@/components/shared/field";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PainSlider } from "@/features/symptom-check/controls";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";
import { sanitizeText } from "@/lib/sanitize";

const COMPLAINTS = [
  "Menstrual Disorder",
  "Pelvic Pain",
  "Hormonal Concerns",
  "Maternal Health / Pregnancy",
  "Other",
];

const fieldLabel = (text) => <span className="text-[13px]">{text}</span>;
const inputClass = "border-border h-11 rounded-lg px-3.5";

/** Free-entry list of symptoms shown as removable chips. */
function SymptomTags({ symptoms, onChange }) {
  const id = useId();
  const [input, setInput] = useState("");

  function add() {
    const value = sanitizeText(input, 100);
    if (value && !symptoms.includes(value)) onChange([...symptoms, value]);
    setInput("");
  }

  return (
    <div>
      <Label htmlFor={id} className="mb-2 text-[13px]">
        Symptoms
      </Label>
      {symptoms.length ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {symptoms.map((symptom) => (
            <li key={symptom}>
              <button
                type="button"
                onClick={() => onChange(symptoms.filter((s) => s !== symptom))}
                aria-label={`Remove ${symptom}`}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-pink-light bg-pink-pale px-3 py-[5px] text-[13px] font-medium text-primary"
              >
                {symptom} <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type symptom and press Enter"
          className="h-10 flex-1 rounded-full border-dashed border-border text-[13px]"
        />
        <Button
          type="button"
          variant="outline"
          size="xl"
          onClick={add}
          className="h-10 rounded-full border-dashed bg-card px-4 text-[13px] font-normal text-body"
        >
          <Plus aria-hidden="true" /> Add
        </Button>
      </div>
    </div>
  );
}

/**
 * Field assessment logged by a CHW on a patient's behalf. Submits to the same
 * AI triage endpoint as the patient symptom check, tagged with user_type "CHW".
 */
export function AssessmentForm({ onLogged }) {
  const [age, setAge] = useState("");
  const [temperature, setTemperature] = useState("");
  const [complaint, setComplaint] = useState(COMPLAINTS[0]);
  const [duration, setDuration] = useState(1);
  const [painLevel, setPainLevel] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const durationId = useId();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!age) {
      setError("Patient age is required.");
      return;
    }

    const notes = [
      `Chief complaint: ${complaint}.`,
      temperature ? `Temperature: ${sanitizeText(temperature, 10)}°C.` : null,
      `Duration: ${duration} day${duration !== 1 ? "s" : ""}.`,
    ];

    setLoading(true);
    try {
      const { data } = await api.post("/api/symptoms/analyse/", {
        age: Number(age),
        location: "Field Assessment",
        user_type: "CHW",
        pain_level: painLevel,
        symptoms,
        other_symptoms: notes.filter(Boolean).join(" "),
      });
      onLogged({
        id: data.submission_id,
        risk_tier: data.risk_tier,
        symptoms,
        ai_result: data,
        created_at: new Date().toISOString(),
      });
      setAge("");
      setTemperature("");
      setDuration(1);
      setPainLevel(0);
      setSymptoms([]);
    } catch (err) {
      setError(flattenErrors(err, "Request failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={fieldLabel("Patient Age")}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={10}
              max={80}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label={fieldLabel("Temperature (°C), if taken")}>
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              placeholder="e.g. 37.2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label={fieldLabel("Chief Complaint")}>
          {(id) => (
            <NativeSelect
              id={id}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="[&_select]:h-11 [&_select]:rounded-lg [&_select]:border-border [&_select]:text-sm"
            >
              {COMPLAINTS.map((option) => (
                <NativeSelectOption key={option}>{option}</NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={durationId} className="text-[13px]">
            Symptom Duration (Days)
          </Label>
          <div className="flex h-11 items-center gap-3">
            <input
              id={durationId}
              type="range"
              min="1"
              max="30"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-6 flex-1 cursor-pointer accent-mauve"
            />
            <span className="min-w-8 text-sm font-bold text-primary">{duration}d</span>
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold">
          Pain severity reported by patient
        </legend>
        <PainSlider value={painLevel} onChange={setPainLevel} />
      </fieldset>

      <SymptomTags symptoms={symptoms} onChange={setSymptoms} />

      <ErrorBanner message={error} />

      <Button
        type="submit"
        variant="mauve"
        size="xl"
        disabled={loading}
        className="h-[46px] self-start rounded-lg text-sm"
      >
        {loading ? (
          <>
            <Spinner /> Analysing…
          </>
        ) : (
          <>
            <ClipboardPlus aria-hidden="true" /> Log Assessment Data
          </>
        )}
      </Button>
    </form>
  );
}
