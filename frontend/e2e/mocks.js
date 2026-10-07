// Shared API mocks and auth helpers. Every backend call is intercepted, so the
// suite needs no running Django server.

function fakeJwt(claims) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ exp, ...claims })}.signature`;
}

const submission = (id, risk_tier, daysAgo, pain_level) => ({
  id,
  user: 1,
  age: 19,
  location: "Nairobi, Kenya",
  user_type: "Patient",
  last_period: "2026-09-12",
  cycle_length: "26-30 days",
  cycle_regularity: "Irregular",
  bleeding_volume: "Heavy",
  bleeding_days: "6-7 days",
  pain_level,
  symptoms: ["Severe cramps", "Fatigue", "Heavy bleeding"],
  other_symptoms: "Pain started two days before my period.",
  ai_result: analysis(risk_tier),
  risk_tier,
  created_at: new Date(Date.UTC(2026, 8, 30 - daysAgo, 9, 30)).toISOString(),
  claimed_by: null,
  claimed_at: null,
  resolved: false,
  resolved_at: null,
});

function analysis(risk_tier) {
  return {
    risk_tier,
    conditions: [
      {
        name: "Primary Dysmenorrhea",
        confidence: 72,
        description: "Painful periods without an underlying pelvic condition, common in adolescents.",
        tags: ["cramps", "pain"],
      },
      {
        name: "Menorrhagia",
        confidence: 48,
        description: "Heavier or longer bleeding than usual that may lead to tiredness.",
        tags: ["heavy bleeding", "fatigue"],
      },
    ],
    next_steps: [
      "Visit a clinic within the next one to two weeks.",
      "Track your bleeding and pain for the next cycle.",
      "Rest, hydrate and use a warm compress for cramps.",
    ],
    team_note: "You did the right thing by checking in. We are with you.",
  };
}

const submissions = [
  submission(4, "refer", 1, 7),
  submission(3, "monitor", 9, 4),
  submission(2, "urgent", 20, 9),
  submission(1, "monitor", 28, 3),
];

const page = (results) => ({ count: results.length, next: null, previous: null, results });

const me = {
  id: 1,
  username: "amina",
  email: "amina@example.com",
  age: 19,
  location: "Nairobi, Kenya",
  tier: "standard",
  is_chw: true,
  email_verified: true,
  guardian_consent_status: "not_required",
};

const pricing = [
  { code: "free", name: "Free", price_min_usd: "0.00", price_max_usd: "0.00", billing_cycle: "one_time", self_serve: true, features: ["One-time symptom intake, AI triage, and doctor referral"], description: "Open to anyone." },
  { code: "under_18", name: "Under-18 (discounted)", price_min_usd: "0.99", price_max_usd: "0.99", billing_cycle: "monthly", self_serve: false, features: ["Standard-level access at a discounted, institutionally-gated price"], description: "Institutionally gated only." },
  { code: "standard", name: "Standard", price_min_usd: "2.99", price_max_usd: "2.99", billing_cycle: "monthly", self_serve: true, features: ["Unlimited triage", "Symptom history log", "Cycle/phase tracking", "Direct doctor referral link"], description: "Open self-signup, any age." },
  { code: "premium", name: "Premium", price_min_usd: "7.99", price_max_usd: "7.99", billing_cycle: "monthly", self_serve: true, features: ["Everything in Standard", "Multiple profiles", "Richer AI reports", "Priority processing", "Human doctor callback"], description: "Open self-signup, any age." },
].map((t) => ({ price_min_kes: null, price_max_kes: null, ...t }));

const referrals = submissions
  .filter((s) => s.risk_tier !== "monitor")
  .map(({ user, claimed_by, claimed_at, resolved, resolved_at, last_period, ...rest }, i) => ({
    ...rest,
    claimed_by_me: i === 0,
  }));

const routes = [
  [/\/api\/auth\/me\/$/, me],
  [/\/api\/symptoms\/history\//, page(submissions)],
  [/\/api\/symptoms\/latest\/$/, { latest: submissions[0], total_count: submissions.length }],
  [/\/api\/symptoms\/analyse\/$/, { submission_id: 5, ...analysis("refer") }],
  [/\/api\/symptoms\/\d+\/$/, submissions[0]],
  [/\/api\/chw\/assessments\//, page(submissions)],
  [/\/api\/doctor\/referrals\//, page(referrals)],
  [/\/api\/billing\/pricing\/$/, pricing],
  [/\/api\/billing\/doctor-subscription\/$/, { has_subscription: true, tier: "solo", status: "active", practitioner_count: null, price_usd: "24.99", current_period_end: null, created_at: "2026-09-01T08:00:00Z" }],
  [/\/api\/auth\/verify-email\/confirm\/$/, { detail: "Your email has been verified." }],
];

export async function mockApi(page) {
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const match = routes.find(([pattern]) => pattern.test(url));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(match ? match[1] : { detail: "ok" }),
    });
  });
}

export async function logIn(page, claims = {}) {
  const token = fakeJwt({ user_id: 1, is_chw: true, tier: "standard", ...claims });
  await page.addInitScript(
    ([access, result]) => {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", access);
      sessionStorage.setItem("sistercircle_result", result);
    },
    [token, JSON.stringify({ submission_id: 5, ...analysis("refer") })]
  );
}
