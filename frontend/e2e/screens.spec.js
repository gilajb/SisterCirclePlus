import { test, expect } from "@playwright/test";
import { logIn, mockApi } from "./mocks.js";

// Captures a full-page screenshot of every route at phone and desktop width.
// SCREENS_LABEL picks the output folder, so a run before and after a refactor
// can be compared side by side: e2e/__screens__/<label>/<route>-<viewport>.png
const LABEL = process.env.SCREENS_LABEL || "current";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
];

const PUBLIC_ROUTES = [
  { name: "landing", path: "/" },
  { name: "signup", path: "/signup" },
  { name: "pricing", path: "/pricing" },
  { name: "contact", path: "/contact" },
  { name: "terms", path: "/terms" },
  { name: "privacy", path: "/privacy" },
  { name: "reset-password", path: "/reset-password" },
  { name: "reset-password-confirm", path: "/reset-password?uid=MQ&token=abc-123" },
  { name: "verify-email", path: "/verify-email?uid=MQ&token=abc-123" },
  { name: "guardian-consent", path: "/guardian-consent?uid=MQ&token=abc-123&decision=approve" },
  { name: "not-found", path: "/no-such-page" },
];

const PRIVATE_ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "symptom-check", path: "/symptom-check" },
  { name: "results", path: "/results" },
  { name: "settings", path: "/settings" },
  { name: "chw", path: "/chw" },
  { name: "doctor-portal", path: "/doctor-portal" },
];

async function capture(page, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route.path);
  // The dev server keeps a hot-reload socket open, so "networkidle" can stall on a
  // cold compile. Wait for it briefly, then carry on regardless.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await expect(page.locator("body")).not.toBeEmpty();
  await page.screenshot({
    path: `e2e/__screens__/${LABEL}/${route.name}-${viewport.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} screens`, () => {
    test.beforeEach(async ({ page }) => {
      await mockApi(page);
    });

    for (const route of PUBLIC_ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        await capture(page, route, viewport);
      });
    }

    for (const route of PRIVATE_ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        await logIn(page);
        await capture(page, route, viewport);
        await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      });
    }
  });
}

test("protected route redirects to signup when logged out", async ({ page }) => {
  await mockApi(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signup$/);
});
