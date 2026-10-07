"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Field } from "@/components/shared/field";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";

/** Step 1 — request a reset link by email. */
function RequestStep() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/request/", { email });
      setSent(true);
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3 py-3 text-center">
        <Check className="mx-auto size-8" aria-hidden="true" />
        <h1 className="font-heading text-base font-bold">Check your email</h1>
        <p className="text-[13px] leading-relaxed text-body">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <div>
        <h1 className="mb-1.5 font-heading text-lg font-bold">Reset your password</h1>
        <p className="text-[13px] text-muted-foreground">
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>
      <Field label="Email Address">
        {(id) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="grace@example.com"
          />
        )}
      </Field>
      <ErrorBanner message={error} />
      <Button
        type="submit"
        variant="plum"
        size="xl"
        disabled={loading}
        className="h-[52px] text-base"
      >
        {loading ? (
          <>
            <Spinner /> Sending…
          </>
        ) : (
          "Send Reset Link"
        )}
      </Button>
    </form>
  );
}

/** Step 2 — set a new password (uid/token present in the URL from the emailed link). */
function ConfirmStep({ uid, token }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!password || !password2) {
      setError("Please fill in both password fields.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/confirm/", { uid, token, password, password2 });
      setDone(true);
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 py-3 text-center">
        <Check className="mx-auto size-8" aria-hidden="true" />
        <h1 className="font-heading text-base font-bold">Password reset</h1>
        <p className="text-[13px] text-body">Your password has been changed.</p>
        <Button asChild variant="plum" size="xl" className="mt-2 w-full">
          <Link href="/signup">
            Log In <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <h1 className="font-heading text-lg font-bold">Choose a new password</h1>
      <Field label="New Password">
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        )}
      </Field>
      <Field label="Confirm New Password">
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="••••••••"
          />
        )}
      </Field>
      <ErrorBanner message={error} />
      <Button
        type="submit"
        variant="plum"
        size="xl"
        disabled={loading}
        className="h-[52px] text-base"
      >
        {loading ? (
          <>
            <Spinner /> Resetting…
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );
}

export function ResetPassword() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  return uid && token ? <ConfirmStep uid={uid} token={token} /> : <RequestStep />;
}
