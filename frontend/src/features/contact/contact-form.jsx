"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Field } from "@/components/shared/field";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";
import { sanitizeText, validateEmail } from "@/lib/sanitize";

const TOPICS = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Account or technical support" },
  { value: "partnership", label: "Partnership or institution" },
  { value: "press", label: "Press or media" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanName = sanitizeText(name, 100);
    const cleanMessage = sanitizeText(message, 2000);

    if (!cleanName || !email || !cleanMessage) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error);
      return;
    }
    if (cleanMessage.length < 10) {
      setError("Please include a bit more detail in your message.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/contact/", { name: cleanName, email, topic, message: cleanMessage });
      setSent(true);
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-[10px] border border-success-border bg-success-bg p-5 text-success"
      >
        <Check className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
        <div>
          <p className="mb-1 text-[15px] font-bold">Thanks for reaching out</p>
          <p className="text-[13px] leading-normal">
            We've received your message and will get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <ErrorBanner message={error} />

      <Field label="Name">
        {(id) => (
          <Input
            id={id}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        )}
      </Field>

      <Field label="Email">
        {(id) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Topic">
        {(id) => (
          <NativeSelect id={id} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => (
              <NativeSelectOption key={t.value} value={t.value}>
                {t.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </Field>

      <Field label="Message">
        {(id) => (
          <Textarea
            id={id}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            rows={6}
            maxLength={2000}
            className="min-h-36 resize-y"
          />
        )}
      </Field>

      <Button type="submit" size="xl" disabled={loading} className="rounded-lg font-semibold">
        {loading ? <Spinner /> : "Send Message"}
      </Button>
    </form>
  );
}
