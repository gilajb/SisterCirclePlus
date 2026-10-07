"use client";

import { Info } from "lucide-react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChipGrid,
  Group,
  InfoBox,
  PainSlider,
  RadioCards,
  ReviewSection,
  SegmentGroup,
} from "./controls";

export const STEPS = [
  {
    label: "Basics",
    title: "Tell us about yourself",
    sub: '"We\'re listening. Tell us more about your experience."',
  },
  {
    label: "Cycle",
    title: "How's your cycle?",
    sub: "Tell us about your last period to help us understand your baseline.",
  },
  {
    label: "Symptoms",
    title: "What are you experiencing?",
    sub: "Be as specific as you can — every detail helps the analysis.",
  },
  {
    label: "Review",
    title: "Review your information",
    sub: "Check everything before we run your analysis.",
  },
];

const USER_TYPES = [
  { value: "Patient", label: "Patient" },
  { value: "CHW", label: "Community Health Worker" },
];

const SYMPTOM_OPTIONS = [
  "Severe cramping",
  "Pelvic heaviness",
  "Lower back pain",
  "Fatigue / low energy",
  "Bloating",
  "Nausea",
  "Pain during intercourse",
  "Pain when urinating",
  "Irregular spotting",
  "Mood changes",
  "Headaches",
  "Breast tenderness",
];

const required = (text) => (
  <span>
    {text}
    <span className="text-primary"> *</span>
  </span>
);

const inputClass = "rounded-lg";

export function BasicsStep({ form, set }) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={required("Age")}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={10}
              max={80}
              placeholder="Enter age"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label={required("Location (City, Country)")}>
          {(id) => (
            <Input
              id={id}
              placeholder="e.g. Lagos, Nigeria"
              autoComplete="address-level2"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
      </div>
      <Group label="I am filling this form as a:" required>
        <RadioCards
          name="userType"
          options={USER_TYPES}
          value={form.userType}
          onChange={(v) => set("userType", v)}
        />
      </Group>
    </>
  );
}

export function CycleStep({ form, set }) {
  return (
    <>
      <Field label={required("Last Period Start Date")}>
        {(id) => (
          <Input
            id={id}
            type="date"
            value={form.lastPeriod}
            onChange={(e) => set("lastPeriod", e.target.value)}
            className={inputClass}
          />
        )}
      </Field>
      <Group label="Cycle Length (Typical)" required>
        <SegmentGroup
          name="cycleLength"
          options={["Short", "Average", "Long"]}
          value={form.cycleLength}
          onChange={(v) => set("cycleLength", v)}
        />
      </Group>
      <Group label="Cycle Regularity" required>
        <SegmentGroup
          name="cycleRegularity"
          options={["Very Regular", "Mostly Regular", "Irregular", "Very Irregular"]}
          value={form.cycleRegularity}
          onChange={(v) => set("cycleRegularity", v)}
        />
      </Group>
      <Group label="Bleeding Volume" required>
        <SegmentGroup
          name="bleedingVolume"
          options={["Light", "Moderate", "Heavy", "Very Heavy"]}
          value={form.bleedingVolume}
          onChange={(v) => set("bleedingVolume", v)}
        />
      </Group>
      <Group label="How many days does your period last?" required>
        <SegmentGroup
          name="bleedingDays"
          options={["1–3 days", "4–5 days", "6–7 days", "8+ days"]}
          value={form.bleedingDays}
          onChange={(v) => set("bleedingDays", v)}
        />
      </Group>
      <InfoBox>
        "Heavy bleeding that soaks through a pad in under an hour is a clinical signal worth noting,
        Sister."
      </InfoBox>
    </>
  );
}

export function SymptomsStep({ form, set }) {
  const toggleSymptom = (symptom) =>
    set(
      "symptoms",
      form.symptoms.includes(symptom)
        ? form.symptoms.filter((s) => s !== symptom)
        : [...form.symptoms, symptom],
    );

  return (
    <>
      <Group label="Pain severity (0 = none, 10 = severe)" required>
        <PainSlider value={form.painLevel} onChange={(v) => set("painLevel", v)} />
      </Group>
      <Group label="Select all symptoms that apply" required>
        <ChipGrid options={SYMPTOM_OPTIONS} selected={form.symptoms} onToggle={toggleSymptom} />
      </Group>
      <Field label="Anything else you'd like us to know?">
        {(id) => (
          <Textarea
            id={id}
            rows={4}
            maxLength={500}
            placeholder="Describe any other symptoms, patterns, or concerns..."
            value={form.otherSymptoms}
            onChange={(e) => set("otherSymptoms", e.target.value)}
            className="min-h-28 resize-y rounded-lg text-sm leading-relaxed"
          />
        )}
      </Field>
      <InfoBox>
        "The more you share, the more precise your analysis will be. There are no wrong answers
        here, Sister."
      </InfoBox>
    </>
  );
}

export function ReviewStep({ form }) {
  return (
    <>
      <div className="flex items-start gap-2 rounded-[10px] bg-pink-pale px-5 py-4 text-sm text-primary">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Please review your information before submitting. You can go back to edit any section.
        </span>
      </div>
      <ReviewSection
        title="About You"
        rows={[
          ["Age", form.age],
          ["Location", form.location],
          ["User Type", form.userType],
        ]}
      />
      <ReviewSection
        title="Cycle Details"
        rows={[
          ["Last Period", form.lastPeriod],
          ["Cycle Length", form.cycleLength],
          ["Regularity", form.cycleRegularity],
          ["Bleeding Volume", form.bleedingVolume],
          ["Bleeding Duration", form.bleedingDays],
        ]}
      />
      <ReviewSection
        title="Symptoms"
        rows={[
          ["Pain Level", `${form.painLevel}/10`],
          ["Symptoms", form.symptoms.length > 0 ? form.symptoms.join(", ") : "None selected"],
          ...(form.otherSymptoms ? [["Additional Notes", form.otherSymptoms]] : []),
        ]}
      />
      <p className="rounded-[10px] border border-gold-border bg-gold-light px-5 py-4 text-[13px] leading-relaxed text-gold-dark italic">
        By submitting, you confirm this information is accurate to the best of your knowledge.
        SisterCircle+ analysis is for informational purposes only and does not replace professional
        medical advice.
      </p>
    </>
  );
}
