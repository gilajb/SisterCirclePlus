import { SimpleHeader } from "@/components/layout/simple-header";
import { INSTITUTIONAL_TIERS, getUserTiers } from "@/features/pricing/data";
import { DoctorTiers } from "@/features/pricing/doctor-tiers";
import { LeadForm } from "@/features/pricing/lead-form";
import { UserTiers } from "@/features/pricing/user-tiers";

export const metadata = {
  title: "Pricing",
  description:
    "Clear, tiered access for individuals, doctors and clinics, and the institutions that bring SisterCircle+ to entire communities.",
};

const TABLE_HEADINGS = ["Cohort", "Size", "Annual Price", "Per-Beneficiary"];

function SectionTitle({ children }) {
  return <h2 className="font-heading text-[22px] font-bold">{children}</h2>;
}

export default async function PricingPage() {
  const tiers = await getUserTiers();

  return (
    <div className="min-h-screen">
      <SimpleHeader />

      <main className="mx-auto max-w-[1100px] px-6 pt-10 pb-20 md:px-12 md:pt-14 md:pb-24">
        <div className="mb-10 text-center md:mb-14">
          <h1 className="font-heading mb-3 text-[28px] font-extrabold md:text-[38px]">Pricing</h1>
          <p className="text-body mx-auto max-w-[560px] text-[15px] leading-[1.7]">
            Clear, tiered access for the people we serve, the clinicians they reach, and the
            institutions that bring us to entire communities.
          </p>
        </div>

        <section className="mb-14 md:mb-[72px]">
          <div className="mb-5">
            <SectionTitle>For You</SectionTitle>
          </div>
          <UserTiers initialTiers={tiers} />
        </section>

        <section className="mb-14 md:mb-[72px]">
          <SectionTitle>For Doctors &amp; Clinics</SectionTitle>
          <p className="text-muted-foreground mt-2 mb-5 text-[13px]">
            A flat platform-access subscription — never per-patient or referral-commission based.
          </p>
          <DoctorTiers />
        </section>

        <section>
          <SectionTitle>For NGOs, Schools &amp; CHW Programs</SectionTitle>
          <p className="text-muted-foreground mt-2 mb-5 max-w-[640px] text-[13px] leading-relaxed">
            Priced per-beneficiary/year within a negotiated range. Every institutional tier bundles
            unlimited free/discounted cohort access, bulk CHW code generation and a management
            dashboard, aggregate anonymized reporting, priority CHW onboarding, and a co-branding
            option.
          </p>

          <div className="mb-9 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {TABLE_HEADINGS.map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="text-primary border-b px-3 py-2.5 text-left text-[11px] font-bold tracking-[0.5px] uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTITUTIONAL_TIERS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="border-b px-3 py-3.5 text-left font-semibold">
                      {row.name}
                    </th>
                    <td className="text-body border-b px-3 py-3.5">{row.cohort}</td>
                    <td className="text-body border-b px-3 py-3.5">{row.annual}</td>
                    <td className="text-body border-b px-3 py-3.5">{row.perBeneficiary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The only call to action for this section, and the target of the
              Hospital / Network "Contact Sales" button above. */}
          <div
            id="institutional-lead"
            className="bg-card max-w-[560px] scroll-mt-6 rounded-2xl border p-6 md:p-8"
          >
            <LeadForm />
          </div>
        </section>
      </main>
    </div>
  );
}
