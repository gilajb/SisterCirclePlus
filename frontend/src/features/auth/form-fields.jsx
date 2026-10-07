"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TextInput({ label, hint, value, onChange, ...props }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      {hint ? <p className="text-muted-foreground text-xs leading-normal italic">{hint}</p> : null}
    </div>
  );
}

/** Accepts up to three digits only. */
export function AgeInput({ onChange, ...props }) {
  function handleChange(v) {
    if (v === "" || /^\d{0,3}$/.test(v)) onChange(v);
  }
  return <TextInput type="text" inputMode="numeric" onChange={handleChange} {...props} />;
}

export function PasswordInput({ label, value, onChange, ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function GuardianEmailInput({ value, onChange }) {
  return (
    <TextInput
      label="Parent / Guardian Email"
      placeholder="parent@example.com"
      type="email"
      value={value}
      onChange={onChange}
      hint="Required for users under 16 — we'll email them to request their consent. This never delays your own access to triage support."
    />
  );
}

export function TermsCheckbox({ checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-plum mt-[3px] size-4 shrink-0 cursor-pointer"
      />
      <span className="text-body text-[13px] leading-normal">
        I agree to the{" "}
        <Link href="/terms" target="_blank" className="text-mauve font-semibold underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="text-mauve font-semibold underline">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}

export const isMinorAge = (age) => age !== "" && Number(age) < 16;
