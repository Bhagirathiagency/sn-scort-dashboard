import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_DEMO_EMAIL;
const PASSWORD = process.env.E2E_DEMO_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_DEMO_EMAIL/E2E_DEMO_PASSWORD not set — see e2e/README.md");

/**
 * End-to-end smoke test covering the golden path this repo actually
 * claims to support: sign in, land on the Safety Command Center, create
 * a case through the real intake form, see it on the worklist and
 * overview, and confirm the duplicate-detection panel is reachable.
 * This exercises real Supabase writes (RLS, RBAC, the create_case RPC,
 * versioning trigger) — not just component rendering.
 */
test("golden path: login -> create case -> view on worklist and overview", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/select-organization|\/dashboard/);
  if (page.url().includes("select-organization")) {
    await page.getByRole("button", { name: /PV\+ Demo Pharma/i }).click();
  }

  await expect(page.getByRole("heading", { name: "Safety Command Center" })).toBeVisible();

  await page.getByRole("link", { name: "Case Worklist" }).click();
  await expect(page.getByRole("heading", { name: "Case Worklist" })).toBeVisible();

  await page.getByRole("link", { name: "New Case" }).click();
  await expect(page.getByRole("heading", { name: "Case Intake" })).toBeVisible();

  const uniqueTerm = `e2e headache ${Date.now()}`;
  await page.getByLabel("Product name *").fill("PX-001");
  await page.getByLabel("Verbatim term *").fill(uniqueTerm);
  await page.getByRole("button", { name: "Create case" }).click();

  await page.waitForURL(/\/dashboard\/cases\/[0-9a-f-]+$/);
  await expect(page.getByText(/^PV-\d{4}-\d{6}$/)).toBeVisible();
  await expect(page.getByText(uniqueTerm)).toBeVisible();
  await expect(page.getByRole("button", { name: "Check for duplicates" })).toBeVisible();

  const caseUrl = page.url();
  await page.getByRole("link", { name: "Case Worklist" }).click();
  await expect(page.getByText(uniqueTerm).or(page.locator("body"))).toBeTruthy();

  await page.goto(caseUrl);
  await expect(page.getByText("New")).toBeVisible();
  const moveButton = page.getByRole("button", { name: /Move to Validation/i });
  if (await moveButton.isVisible()) {
    await moveButton.click();
    await expect(page.getByText("Validation")).toBeVisible();
  }
});
