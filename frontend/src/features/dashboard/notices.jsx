"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import api from "@/lib/api";

const bar = "flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-5 py-2.5 md:px-12";

/** Non-blocking reminder; core triage access never requires a verified email. */
function VerifyEmailNotice() {
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  async function resend() {
    setState("sending");
    try {
      await api.post("/api/auth/verify-email/request/");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={`${bar} border-danger-border bg-danger-bg text-xs text-danger`}>
      <span>Please verify your email — check your inbox for a link.</span>
      {state === "sent" ? (
        <span role="status" className="font-bold">
          Sent
        </span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="cursor-pointer font-bold underline disabled:cursor-default"
        >
          {state === "sending"
            ? "Sending…"
            : state === "error"
              ? "Couldn't send — retry"
              : "Resend email"}
        </button>
      )}
    </div>
  );
}

function PortalLink({ href, children }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-bold underline">
      {children} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/** Account-status strips shown under the header. Each renders only when relevant. */
export function DashboardNotices({ me, portals }) {
  return (
    <>
      {me?.email_verified === false ? <VerifyEmailNotice /> : null}

      {/* Informational only; triage access is never gated on guardian consent. */}
      {me?.guardian_consent_status === "pending" ? (
        <div className={`${bar} border-gold-border bg-gold-light text-xs text-gold-dark`}>
          We've asked your parent/guardian to confirm this account — you already have full access,
          no need to wait.
        </div>
      ) : null}

      {/* A returning CHW or doctor otherwise has no way back into their portal. */}
      {portals.chw || portals.doctor ? (
        <div className={`${bar} border-gold-border bg-gold-light text-gold-dark`}>
          <span className="text-xs font-semibold">Quick access:</span>
          {portals.chw ? <PortalLink href="/chw">Institutional Portal</PortalLink> : null}
          {portals.doctor ? <PortalLink href="/doctor-portal">Doctor Portal</PortalLink> : null}
        </div>
      ) : null}
    </>
  );
}
