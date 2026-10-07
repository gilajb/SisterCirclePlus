"use client";

import Link from "next/link";
import {
  CirclePlus,
  Flower2,
  House,
  MessageCircle,
  Plus,
  Star,
  Stethoscope,
  TriangleAlert,
  Trophy,
  User,
} from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Panel } from "@/components/shared/panel";
import { riskLabel } from "@/components/shared/risk-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { decodePayload } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PainBarChart, PainLineChart } from "./charts";
import { HealthHistory, RecentReports, UpgradeNotice, firstCondition } from "./history";
import { DashboardNotices } from "./notices";
import { useDashboardData } from "./use-dashboard-data";

const container = "mx-auto max-w-[1100px] px-5 pt-6 pb-40 md:px-12 md:pt-10 md:pb-[60px]";

const TABS = [
  { icon: House, label: "Home", href: "/dashboard", active: true },
  { icon: Stethoscope, label: "Triage", href: "/symptom-check" },
  { icon: MessageCircle, label: "Support", href: "/contact" },
  { icon: User, label: "Account", href: "/settings" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className={container} aria-busy="true" aria-label="Loading your dashboard">
      <Skeleton className="mb-3 h-10 w-64" />
      <Skeleton className="mb-8 h-[18px] w-80 max-w-full" />
      <div className="mb-7 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[88px]" />
        ))}
      </div>
      <Skeleton className="mb-5 h-[200px]" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="mb-4 h-16" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <Flower2 className="size-14 text-primary" aria-hidden="true" />
      <h1 className="font-heading text-2xl font-bold">No analyses yet</h1>
      <p className="max-w-[340px] text-[15px] leading-relaxed text-body">
        Your health history will appear here after your first symptom check. Let's start listening
        to your body.
      </p>
      <Button asChild variant="mauve" size="xl" className="mt-2 rounded-lg px-7 font-semibold">
        <Link href="/symptom-check">
          <CirclePlus aria-hidden="true" /> Start Your First Analysis
        </Link>
      </Button>
    </div>
  );
}

function StatCard({ label, icon: Icon, sub, children }) {
  return (
    <div className="rounded-xl border bg-card px-6 py-5">
      <p className="mb-2.5 text-[11px] font-bold tracking-[0.8px] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="flex items-center gap-1.5 font-heading text-[22px] font-extrabold">
        {Icon ? <Icon className="size-[18px] shrink-0" aria-hidden="true" /> : null}
        {children}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function MobileStat({ label, className, children }) {
  return (
    <div className={cn("rounded-xl border bg-card px-4 py-3.5", className)}>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Fixed "New Analysis" button and tab bar — phones only. */
function MobileNav() {
  return (
    <div className="md:hidden">
      <div className="fixed inset-x-5 bottom-[72px] z-40">
        <Button asChild variant="plum" size="xl" className="h-[52px] w-full rounded-full text-base">
          <Link href="/symptom-check">
            <Plus aria-hidden="true" /> New Analysis
          </Link>
        </Button>
      </div>
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card pt-2 pb-1.5"
      >
        {TABS.map(({ icon: Icon, label, href, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground",
              active && "font-semibold text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Overview({ submissions, totalCount, historyLimited, me }) {
  const latest = submissions[0] ?? null; // newest first
  const lastCondition = firstCondition(latest)?.name ?? "—";
  const lastRisk = latest ? riskLabel(latest.risk_tier).toUpperCase() : "—";
  const name = me?.username ? me.username.charAt(0).toUpperCase() + me.username.slice(1) : "Sister";
  const showUpgrade = historyLimited && totalCount > submissions.length;

  // date_joined isn't exposed by the API, so the token's issue time stands in for it.
  const iat = decodePayload()?.iat;
  const memberSince = iat
    ? new Date(iat * 1000).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "—";

  return (
    <main className={container}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold tracking-[1px] text-primary uppercase md:hidden">
            {greeting()}, {name}
          </p>
          <h1 className="mb-1.5 font-heading text-[28px] font-extrabold text-primary md:text-4xl">
            <span className="md:hidden">Your Health Today</span>
            <span className="hidden md:inline">Hello, {name}.</span>
          </h1>
          <p className="text-[15px] text-body">
            <span className="md:hidden">Clinical clarity tailored for your wellness journey.</span>
            <span className="hidden md:inline">
              Here's your health history and analysis overview.
            </span>
          </p>
        </div>
        <Button
          asChild
          variant="mauve"
          size="xl"
          className="hidden h-11 rounded-lg text-sm font-semibold md:inline-flex"
        >
          <Link href="/symptom-check">
            <CirclePlus aria-hidden="true" /> Start New Analysis
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-gold-border bg-gold-light px-4 py-3.5 text-sm font-semibold text-gold-dark md:hidden">
        <Trophy className="size-5 shrink-0" aria-hidden="true" />
        {totalCount} analys{totalCount !== 1 ? "es" : "is"} completed — keep tracking!
      </div>

      {/* Stat cards — desktop */}
      <div className="mb-7 hidden grid-cols-4 gap-4 md:grid">
        <StatCard label="Total analyses" sub="Records">
          {totalCount}
        </StatCard>
        <StatCard label="Latest risk level" icon={CirclePlus}>
          {lastRisk}
        </StatCard>
        <StatCard label="Condition flagged" icon={TriangleAlert}>
          {lastCondition}
        </StatCard>
        <StatCard label="Member since" sub="Active Member">
          {memberSince}
        </StatCard>
      </div>

      {/* Stat cards — phones */}
      <div className="mb-7 grid grid-cols-2 gap-4 md:hidden">
        <MobileStat label="Latest Analysis" className="border-[1.5px] border-mauve p-4">
          <p className="mb-1 font-heading text-lg font-extrabold">
            {formatDate(latest?.created_at)}
          </p>
          <p className="text-xs text-primary">
            {lastCondition !== "—" ? lastCondition : "No condition flagged"}
          </p>
        </MobileStat>
        <div className="flex flex-col gap-2.5">
          <MobileStat label="Total Analyses" className="flex-1 border-[1.5px] border-gold">
            <p className="font-heading text-xl font-extrabold">{totalCount}</p>
          </MobileStat>
          <MobileStat label="Risk Status" className="flex-1">
            <p className="font-heading text-sm font-extrabold">{lastRisk}</p>
          </MobileStat>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 md:flex-row">
        <div className="flex w-full flex-1 flex-col gap-5">
          <Panel as="section" className="p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="mb-1 font-heading text-base font-bold uppercase md:normal-case">
                  <span className="md:hidden">Wellness trend</span>
                  <span className="hidden md:inline">Symptom Severity Trend</span>
                </h2>
                <p className="hidden text-[13px] text-muted-foreground md:block">
                  Self-reported 0–10 scale over last {Math.min(submissions.length, 7)} analyses
                </p>
              </div>
              <span className="hidden rounded-full border bg-background px-3 py-1 text-xs text-body md:inline">
                Pain Data
              </span>
              <Link
                href="/symptom-check"
                className="text-[13px] font-semibold text-primary md:hidden"
              >
                New Check
              </Link>
            </div>
            <PainBarChart submissions={submissions} className="md:hidden" />
            <PainLineChart submissions={submissions} className="hidden md:block" />
          </Panel>

          <div className="hidden items-center gap-5 rounded-2xl border border-gold-border bg-gold-light px-6 py-5 md:flex">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold">
              <Star className="size-[22px] fill-current" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="mb-1 font-heading text-base font-bold">Lifetime Legacy Access</p>
              <p className="text-[13px] text-body">
                You have free lifetime access to SisterCircle+ as a founding member.
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-foreground px-3.5 py-2 text-center text-[11px] leading-tight font-bold text-white uppercase">
              Free tier
              <br />
              badge
            </span>
          </div>

          <section className="md:hidden">
            <h2 className="mb-3 text-xs font-bold tracking-[1px] uppercase">Recent reports</h2>
            <RecentReports submissions={submissions} />
            {showUpgrade ? <UpgradeNotice totalCount={totalCount} className="mt-3" /> : null}
          </section>
        </div>

        <Panel as="section" className="hidden w-80 shrink-0 p-6 md:block">
          <h2 className="mb-5 font-heading text-lg font-bold">Health History</h2>
          <HealthHistory submissions={submissions} />
          {showUpgrade ? <UpgradeNotice totalCount={totalCount} className="mt-4" /> : null}
        </Panel>
      </div>
    </main>
  );
}

export function Dashboard() {
  const { loading, submissions, totalCount, historyLimited, me, portals } = useDashboardData();

  return (
    <div className="min-h-screen">
      <AppHeader
        mobileEnd={
          <Link
            href="/settings"
            aria-label="Account settings"
            className="flex size-11 items-center justify-center text-plum"
          >
            <User className="size-5" />
          </Link>
        }
      />
      <DashboardNotices me={me} portals={portals} />

      {loading ? (
        <DashboardSkeleton />
      ) : totalCount === 0 ? (
        <EmptyState />
      ) : (
        <Overview
          submissions={submissions}
          totalCount={totalCount}
          historyLimited={historyLimited}
          me={me}
        />
      )}

      <AppFooter />
      <MobileNav />
    </div>
  );
}
