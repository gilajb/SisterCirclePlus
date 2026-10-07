"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { flattenErrors } from "@/lib/errors";

export function VerifyEmail() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [status, setStatus] = useState(uid && token ? "verifying" : "missing");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!(uid && token)) return;
    api
      .post("/api/auth/verify-email/confirm/", { uid, token })
      .then(() => setStatus("done"))
      .catch((err) => {
        setError(flattenErrors(err));
        setStatus("error");
      });
  }, [uid, token]);

  if (status === "verifying") {
    return <p className="text-sm text-muted-foreground">Verifying your email…</p>;
  }

  if (status === "done") {
    return (
      <>
        <Check className="mx-auto size-8" aria-hidden="true" />
        <h1 className="font-heading text-base font-bold">Email verified</h1>
        <p className="text-[13px] text-body">Your email address has been confirmed.</p>
        <Button asChild variant="plum" size="xl" className="mt-2 w-full">
          <Link href="/dashboard">
            Go to Dashboard <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <ErrorBanner
        message={status === "missing" ? "This verification link is missing its token." : error}
      />
      <p className="text-[13px] text-muted-foreground">
        You can request a new verification email from your dashboard.
      </p>
    </>
  );
}
