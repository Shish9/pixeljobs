import { expect, test } from "@playwright/test";

/**
 * Signed-in journey. Requires a CONFIRMED, not-yet-onboarded test account:
 *   E2E_EMAIL, E2E_PASSWORD           (see docs/testing.md for how to create and delete one)
 *   E2E_EXPECT_ADMIN=1                (optional) the account has the admin role
 * Runs serially on desktop only because it mutates the account.
 */
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe.configure({ mode: "serial" });
test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD not set");
test.skip(({ isMobile }) => isMobile, "desktop only");

// 1×1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("sign in → onboarding → dashboard → settings → sign out", async ({ page }) => {
  await page.goto("/en/sign-in?next=%2Fen%2Fdashboard");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Not onboarded yet → dashboard bounces to onboarding.
  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByText("Choose at least one option.")).toBeVisible();

  await page.getByText("I want to hire").click();
  await page.getByText("I want to work").click();
  await page.getByLabel("City").selectOption("erbil");
  await page.getByRole("button", { name: "Finish setup" }).click();

  // No username needed to finish onboarding; the dashboard lists it as a next step.
  await expect(page).toHaveURL(/\/en\/dashboard\?mode=freelancer/);
  await expect(page.getByRole("heading", { name: "Next steps" })).toBeVisible();
  await expect(page.getByText("Choose a username")).toBeVisible();
  await page.getByRole("link", { name: "Client" }).click();
  await expect(page).toHaveURL(/mode=client/);
  await expect(page.getByText(/Posting projects and requesting services/)).toBeVisible();

  // Settings: profile text + avatar + privacy.
  await page.goto("/en/settings");
  await page.getByLabel("Username").fill(`e2e_${Date.now().toString(36)}`);
  await page.getByLabel("Headline").fill("Brand designer");
  await page.getByLabel("About you").fill("I design brand identities for businesses in Erbil and beyond.");
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.locator("section[aria-labelledby=profile]").getByRole("status").filter({ hasText: "Saved" }).first()).toBeVisible();

  await page.getByLabel("Profile photo").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Upload photo" }).click();
  const avatarForm = page.locator("form:has(#avatar)");
  await expect(avatarForm.getByRole("status")).toContainText("Saved");
  await expect(page.getByRole("button", { name: "Remove photo" })).toBeVisible();

  // Spoofed file type is rejected by the server (magic-byte check).
  await page.getByLabel("Profile photo").setInputFiles({ name: "x.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") });
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.locator("#avatar-error")).toHaveText("Please upload a JPG, PNG or WebP image.");

  // Digit style: switch to Western digits and see it applied on a Kurdish page.
  await page.getByText("Western digits (123)").click();
  await page.locator("section[aria-labelledby=preferences]").getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("section[aria-labelledby=preferences]").getByRole("status")).toContainText("Saved");
  await page.goto("/ckb/dashboard");
  await expect(page.locator("#next-steps").locator("..").getByText(/[0-9]/).first()).toBeVisible();
  await page.goto("/en/settings");

  await page.getByText("Private — only people I'm working with").click();
  await page.locator("section[aria-labelledby=privacy]").getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("section[aria-labelledby=privacy]").getByRole("status")).toContainText("Saved");

  // Guest-only pages bounce signed-in users.
  await page.goto("/en/sign-in");
  await expect(page).toHaveURL(/\/en\/dashboard$/);

  // Admin area: 404 for non-staff, visible for admins.
  const res = await page.goto("/en/admin");
  if (process.env.E2E_EXPECT_ADMIN === "1") {
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  } else {
    expect(res?.status()).toBe(404);
  }

  // Sign out.
  await page.goto("/en/dashboard");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\?signed_out=1$/);
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/sign-in/);
});
