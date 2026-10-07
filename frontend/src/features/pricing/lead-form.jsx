"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

const EMPTY = {
  org_name: "",
  contact_name: "",
  email: "",
  phone: "",
  estimated_cohort_size: "",
  message: "",
};

const label = (text) => <span className="text-[13px]">{text}</span>;

/** "Talk to us" — the only route into institutional and hospital pricing. */
export function LeadForm() {
  const [lead, setLead] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setLead((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!lead.org_name || !lead.email) {
      setError("Please share at least your organization name and email.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/billing/institutional-lead/", {
        ...lead,
        estimated_cohort_size: lead.estimated_cohort_size
          ? Number(lead.estimated_cohort_size)
          : undefined,
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong sending your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="py-5 text-center">
        <Check className="mx-auto mb-2.5 size-8" aria-hidden="true" />
        <p className="mb-1.5 font-heading text-base font-bold">Thank you — we'll be in touch.</p>
        <p className="text-[13px] text-body">
          Our team reviews every institutional inquiry personally.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h3 className="font-heading text-base font-bold">Talk to us</h3>
      <Field label={label("Organization name *")}>
        {(id) => (
          <Input
            id={id}
            required
            autoComplete="organization"
            value={lead.org_name}
            onChange={set("org_name")}
            placeholder="e.g., Amani Youth Initiative"
          />
        )}
      </Field>
      <Field label={label("Contact name")}>
        {(id) => (
          <Input
            id={id}
            autoComplete="name"
            value={lead.contact_name}
            onChange={set("contact_name")}
            placeholder="Your name"
          />
        )}
      </Field>
      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label={label("Email *")}>
          {(id) => (
            <Input
              id={id}
              type="email"
              required
              autoComplete="email"
              value={lead.email}
              onChange={set("email")}
              placeholder="name@organization.org"
            />
          )}
        </Field>
        <Field label={label("Phone")}>
          {(id) => (
            <Input
              id={id}
              type="tel"
              autoComplete="tel"
              value={lead.phone}
              onChange={set("phone")}
              placeholder="+254…"
            />
          )}
        </Field>
      </div>
      <Field label={label("Estimated cohort size")}>
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            value={lead.estimated_cohort_size}
            onChange={(e) =>
              setLead((prev) => ({
                ...prev,
                estimated_cohort_size: e.target.value.replace(/\D/g, ""),
              }))
            }
            placeholder="e.g., 800"
          />
        )}
      </Field>
      <Field label={label("Message")}>
        {(id) => (
          <Textarea
            id={id}
            value={lead.message}
            onChange={set("message")}
            placeholder="Tell us a little about your program…"
            className="min-h-[90px] resize-y"
          />
        )}
      </Field>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="mauve" size="xl" disabled={submitting}>
        {submitting ? (
          "Sending…"
        ) : (
          <>
            Talk to us <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
