import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe,
  Heart,
  HeartHandshake,
  Laptop,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRUST_POINTS = [
  { icon: Globe, label: "Global Reach" },
  { icon: Sparkles, label: "AI-Powered" },
  { icon: MapPin, label: "African-First" },
  { icon: Laptop, label: "Free to Start" },
];

// The phone and desktop layouts tell the story with different cards.
const FEATURES_PHONE = [
  {
    icon: BarChart3,
    tone: "pink",
    title: "Symptom Triage",
    desc: "AI-assisted guidance that takes your reported symptoms and location into account.",
  },
  {
    icon: Lock,
    tone: "gold",
    title: "Your Data, Your Control",
    desc: "Export or permanently delete your health data anytime, right from your account.",
    highlight: true,
  },
  {
    icon: HeartHandshake,
    tone: "pink",
    title: "Doctor Referral Network",
    desc: "Urgent and refer-tier results are flagged for review by subscribed doctors and clinics.",
  },
];

const FEATURES_DESKTOP = [
  {
    icon: Sparkles,
    tone: "pink",
    title: "AI-Powered Analysis",
    desc: "A structured triage read — risk tier, possible conditions, and next steps — powered by Claude AI, based on the symptoms you report yourself.",
  },
  {
    icon: ShieldCheck,
    tone: "pink",
    title: "No Waiting Rooms",
    desc: "Get a clear triage read and actionable next steps in minutes, right from your phone — informational support, not a diagnosis.",
    highlight: true,
  },
  {
    icon: Heart,
    tone: "gold",
    title: "Free to Start",
    desc: "Every woman gets a free symptom check, AI triage, and doctor referral — no age restriction, no payment required to begin.",
  },
];

const EXPERIENCE_POINTS = [
  "Secure and private symptom analysis",
  "Immediate clinical triage recommendations",
  "Access to a network of supportive practitioners",
];

function FeatureCard({ icon: Icon, tone, title, desc, highlight }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 rounded-2xl border bg-card p-7",
        highlight && "border-[1.5px] border-primary",
      )}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-[10px]",
          tone === "gold" ? "bg-gold-light text-gold-dark" : "bg-pink-pale text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-[17px] font-bold">{title}</h3>
      <p className="text-sm leading-[1.65] text-body">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-6 py-10 md:flex-row md:gap-12 md:px-12 md:py-[60px]">
          <div className="flex flex-1 flex-col gap-5">
            <span className="w-fit rounded-full bg-pink-pale px-3.5 py-[5px] text-[13px] font-semibold text-primary">
              <span className="md:hidden">Sister-Physician Led Care</span>
              <span className="hidden md:inline">Welcome to SisterCircle+</span>
            </span>
            <h1 className="font-heading text-[30px] leading-[1.2] font-extrabold md:text-[44px]">
              Your body has been speaking. It's time{" "}
              <em className="text-primary">someone listened.</em>
            </h1>
            <p className="max-w-[420px] text-base leading-[1.7] text-body">
              <span className="md:hidden">
                Expert medical diagnostics and compassionate guidance for women, powered by clinical
                data and communal warmth.
              </span>
              <span className="hidden md:inline">
                We provide clinical warmth through sophisticated AI diagnostics tailored
                specifically for African women. Understand your health with dignity and clarity.
              </span>
            </p>
            <div className="mt-2 flex flex-col gap-3.5 md:flex-row">
              <Button asChild size="xl" className="rounded-lg px-7 font-semibold">
                <Link href="/signup">
                  Check My Symptoms <ArrowRight className="md:hidden" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="rounded-lg border-[1.5px] border-foreground bg-transparent px-7 font-semibold"
              >
                <Link href="/signup?type=chw">I'm an Institution</Link>
              </Button>
            </div>
          </div>

          {/* Placeholder until hero photography is available. */}
          <div
            aria-hidden="true"
            className="flex h-[220px] w-full items-center justify-center rounded-2xl bg-linear-135 from-[#c4b4a8] to-[#8a7060] md:h-[380px] md:w-[420px] md:shrink-0"
          >
            <Stethoscope className="size-14 text-white/70 md:size-20" />
          </div>
        </section>

        {/* Trust strip */}
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-3 bg-[#efefed] px-6 py-4 md:gap-x-[60px] md:px-12">
          {TRUST_POINTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13px] font-medium text-body">
              <Icon className="size-4 text-plum" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        {/* Why SisterCircle+ */}
        <section id="why-sistercircle" className="scroll-mt-20 px-6 py-14 md:px-12 md:py-[72px]">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="mb-2 text-center font-heading text-2xl font-extrabold md:text-[34px]">
              <span className="md:hidden">Designed for Dignity</span>
              <span className="hidden md:inline">Why SisterCircle+?</span>
            </h2>
            <p className="mb-8 text-center text-sm text-muted-foreground md:hidden">
              Modern healthcare that feels like family.
            </p>
            <div className="mx-auto mb-8 h-[3px] w-10 bg-primary md:mb-12" aria-hidden="true" />
            <div className="grid gap-5 md:hidden">
              {FEATURES_PHONE.map((card) => (
                <FeatureCard key={card.title} {...card} />
              ))}
            </div>
            <div className="hidden grid-cols-3 gap-5 md:grid">
              {FEATURES_DESKTOP.map((card) => (
                <FeatureCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </section>

        {/* Founder story — phone only */}
        <section className="bg-mauve px-6 py-12 md:hidden">
          <div
            className="mb-4 font-heading text-[64px] leading-none font-extrabold text-pink-light"
            aria-hidden="true"
          >
            99
          </div>
          <blockquote className="font-heading text-[17px] leading-[1.7] text-white italic">
            "For six years, I was told my pain was psychological, then gastrological — anything but
            what it actually was. It took years before anyone said the words dysmenorrhea and
            menorrhagia out loud. Until then, I was told that pain is just normal, like so many
            other girls and women are. I built SisterCircle+ so no one else has to wait years to be
            believed."
          </blockquote>
          <div className="mt-5 flex items-center gap-3">
            {/* Initials placeholder — swap for Joy's photo once we have one */}
            <div className="flex size-9 items-center justify-center rounded-full bg-pink-light text-sm font-bold text-mauve">
              JB
            </div>
            <div>
              <div className="text-sm font-bold text-white">Joy Chepkorir Bett</div>
              <div className="text-[13px] text-pink-light">Founder, SisterCircle+</div>
            </div>
          </div>
        </section>

        {/* Start prompt — phone only */}
        <section className="px-6 py-8 md:hidden">
          <div className="rounded-2xl border bg-card p-6">
            <span className="text-sm font-semibold">Ready when you are</span>
            <p className="mt-2.5 text-sm text-body">
              Start your own symptom check — free, and just a few minutes.
            </p>
          </div>
        </section>

        {/* The SisterCircle Experience — desktop only */}
        <section className="hidden px-12 py-[72px] md:block">
          <div className="mx-auto flex max-w-[1100px] items-center gap-14">
            {/* Placeholder until community photography is available. */}
            <div
              aria-hidden="true"
              className="flex size-[340px] shrink-0 items-center justify-center rounded-2xl bg-linear-135 from-[#3a2c22] via-[#6a4c38] to-[#2a4a2a]"
            >
              <Users className="size-16 text-white/60" />
            </div>
            <div className="flex flex-1 flex-col gap-5">
              <h2 className="font-heading text-[34px] font-extrabold">
                The SisterCircle Experience
              </h2>
              <p className="text-base leading-[1.7] text-body">
                We bridge the gap between high-utility medical diagnostics and a supportive
                community space. It's not just about data; it's about being heard by a
                "physician-sister."
              </p>
              <ul className="flex flex-col gap-3.5">
                {EXPERIENCE_POINTS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-body">
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
