"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, KeyRound, MapPin, Users } from "lucide-react";
import { PortalShell } from "@/components/layout/portal-shell";
import { Panel } from "@/components/shared/panel";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { decodePayload } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AssessmentForm } from "./assessment-form";
import { CodeDialog } from "./code-dialog";
import { RecentAssessments } from "./recent-assessments";

const NAV = [{ icon: Users, label: "Assessments", href: "/chw", active: true }];

const noopSubscribe = () => () => {};
const readIsChw = () => Boolean(decodePayload()?.is_chw);

function StatCard({ icon: Icon, value, label, className }) {
  return (
    <div className={cn("rounded-[14px] p-5", className)}>
      <Icon className="mb-2 size-6" aria-hidden="true" />
      <p className="font-heading text-[28px] font-extrabold text-foreground">{value}</p>
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function ChwPortal() {
  const router = useRouter();
  // The is_chw claim is read from the token; null until the browser has read it.
  const isChw = useSyncExternalStore(noopSubscribe, readIsChw, () => null);

  const [assessments, setAssessments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    if (isChw === false) router.replace("/dashboard?error=chw_required");
  }, [isChw, router]);

  // Paginated (20 per page); only the 10 most recent are shown, so page 1
  // always covers it and `count` carries the true all-time total.
  useEffect(() => {
    if (!isChw) return;
    let cancelled = false;
    api
      .get("/api/chw/assessments/")
      .then((res) => {
        if (cancelled) return;
        setAssessments(res.data.results);
        setTotal(res.data.count);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isChw]);

  function handleLogged(submission) {
    setAssessments((prev) => [submission, ...prev]);
    setTotal((t) => t + 1);
  }

  async function generateCode() {
    setCodeError("");
    setCodeLoading(true);
    try {
      const { data } = await api.post("/api/chw/generate-code/");
      setCode(data.code);
    } catch (err) {
      // Surface the real reason (unverified email, no institutional license, …).
      setCodeError(err.response?.data?.detail || "Couldn't generate a code. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  }

  if (!isChw) return null;

  const pendingReferrals = assessments.filter(
    (a) => a.risk_tier === "refer" || a.risk_tier === "urgent",
  ).length;

  return (
    <PortalShell
      name="Institutional Portal"
      subtitle="School / NGO / CHW Program"
      nav={NAV}
      title="Institutional Dashboard"
      description="Log field assessments and issue patient access codes"
      actions={
        <Button
          variant="outline"
          size="xl"
          onClick={generateCode}
          disabled={codeLoading}
          className="h-11 rounded-lg border-gold-border bg-gold-light px-5 text-sm font-semibold hover:bg-gold-light/70"
        >
          {codeLoading ? (
            <>
              <Spinner /> Generating…
            </>
          ) : (
            <>
              <KeyRound aria-hidden="true" /> Generate Access Code
            </>
          )}
        </Button>
      }
    >
      <CodeDialog code={code} onClose={() => setCode(null)} />

      {codeError ? (
        <p role="alert" className="text-[13px] text-danger">
          {codeError}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <Panel as="section" className="p-5 md:p-7">
            <h2 className="mb-1.5 font-heading text-lg font-bold">New Patient Assessment</h2>
            <p className="mb-5 flex items-center gap-1 text-[13px] text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" /> Field Assessment
            </p>
            <AssessmentForm onLogged={handleLogged} />
          </Panel>

          <Panel as="section" className="p-5 md:p-6">
            <h2 className="mb-5 font-heading text-lg font-bold">Recent Assessments</h2>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading assessments…</p>
            ) : assessments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No assessments yet. Log a patient above to get started.
              </p>
            ) : (
              <RecentAssessments assessments={assessments} />
            )}
          </Panel>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 lg:w-[220px] lg:shrink-0 lg:grid-cols-1 lg:gap-4">
          <StatCard
            icon={ClipboardCheck}
            value={total}
            label="Assessments logged"
            className="bg-gold-light text-gold-dark"
          />
          <StatCard
            icon={MapPin}
            value={pendingReferrals}
            label="Flagged refer or urgent"
            className="bg-[#e8e8f5] text-[#5c5c9c]"
          />
        </div>
      </div>
    </PortalShell>
  );
}
