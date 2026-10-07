import { API_URL } from "@/lib/api";

export const DOCTOR_TIERS = [
  {
    key: "solo",
    name: "Solo Practitioner",
    price: "$24.99/mo",
    includes: ["Verified listing", "Referral inbox"],
    selfServe: true,
  },
  {
    key: "clinic",
    name: "Clinic (2–10)",
    price: "$69.99/mo",
    includes: ["Multi-provider listing", "Referral analytics dashboard"],
    selfServe: true,
    needsPractitionerCount: true,
  },
  {
    key: "hospital",
    name: "Hospital / Network",
    price: "$199.99/mo",
    priceNote: "negotiable",
    includes: ["Priority placement", "Scheduling / API integration", "Sales-led"],
    selfServe: false,
  },
];

export const INSTITUTIONAL_TIERS = [
  { key: "pilot", name: "Pilot / Small", cohort: "≤500", annual: "Up to $1,250", perBeneficiary: "$2.49" },
  { key: "mid", name: "Mid-size", cohort: "501–2,000", annual: "$1,000 – $4,000", perBeneficiary: "$1.99" },
  { key: "large", name: "Large / Multi-site", cohort: "2,001–10,000", annual: "$3,000 – $15,000, negotiable", perBeneficiary: "$1.49" },
  { key: "national", name: "National / Gov", cohort: "10,000+", annual: "Custom, sales-led", perBeneficiary: "Sub-$0.99" },
];

/**
 * Loads the user-tier catalog on the server. Cached and refreshed hourly, so
 * the page is served as static HTML. Returns null if the backend can't be
 * reached (for example while it is asleep during a build); the page then
 * falls back to fetching in the browser.
 */
export async function getUserTiers() {
  try {
    const res = await fetch(`${API_URL}/api/billing/pricing/`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const tiers = await res.json();
    return Array.isArray(tiers) && tiers.length ? tiers : null;
  } catch {
    return null;
  }
}

export function formatUsd(min, max) {
  const lo = Number(min);
  const hi = Number(max);
  if (lo === 0 && hi === 0) return "$0";
  if (lo === hi) return `$${lo.toFixed(2)}`;
  return `$${lo.toFixed(2)}–$${hi.toFixed(2)}`;
}

export const billingCycleLabel = (cycle) => (cycle === "one_time" ? "One-time" : "/mo");
