import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const LOCALES = [
  { code: "en", dir: "ltr", lang: "en" },
  { code: "ar", dir: "rtl", lang: "ar-IQ" },
  { code: "ckb", dir: "rtl", lang: "ckb" },
  { code: "kmr", dir: "rtl", lang: "kmr-Arab" },
] as const;

test.describe("localization", () => {
  for (const l of LOCALES) {
    test(`home renders in ${l.code} with correct lang/dir`, async ({ page }) => {
      await page.goto(`/${l.code}`);
      await expect(page.locator("html")).toHaveAttribute("dir", l.dir);
      await expect(page.locator("html")).toHaveAttribute("lang", l.lang);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("bare paths redirect using Accept-Language", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "ar-IQ", extraHTTPHeaders: { "Accept-Language": "ar-IQ,ar;q=0.9" } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
    await ctx.close();
  });

  test("language switcher keeps the current page", async ({ page, isMobile }) => {
    test.skip(isMobile, "covered on desktop");
    await page.goto("/en/jobs");
    await page.getByRole("button", { name: /Language/ }).click();
    await page.getByRole("link", { name: "کوردی (سۆرانی)" }).click();
    await expect(page).toHaveURL(/\/ckb\/jobs$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("access control", () => {
  for (const path of ["dashboard", "settings", "onboarding", "admin"]) {
    test(`/${path} requires sign-in`, async ({ page }) => {
      await page.goto(`/en/${path}`);
      await expect(page).toHaveURL(new RegExp(`/en/sign-in\\?next=%2Fen%2F${path}`));
    });
  }

  test("auth callback with a bad code fails safely", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid&next=https://evil.example");
    await expect(page).toHaveURL(/\/sign-in\?error=link$/);
  });
});

test.describe("forms", () => {
  test("sign-up validates on the server and shows localized errors", async ({ page }) => {
    await page.goto("/ckb/sign-up");
    await page.getByRole("button", { name: "دروستکردنی هەژمار" }).click();
    await expect(page.locator("#email-error")).toHaveText("ئەم خانەیە پێویستە.");
    await expect(page.locator("#password-error")).toHaveText("لانیکەم ٨ پیت بەکاربهێنە.");
    await page.getByLabel("ئیمەیڵ").fill("not-an-email");
    await page.getByRole("button", { name: "دروستکردنی هەژمار" }).click();
    await expect(page.locator("#email-error")).toHaveText("ئیمەیڵێکی دروست بنووسە.");
    await expect(page.getByLabel("ئیمەیڵ")).toHaveAttribute("aria-invalid", "true");
  });

  test("sign-in shows an error for wrong credentials", async ({ page }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpass123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toContainText(/incorrect|Too many/);
  });
});

test.describe("layout", () => {
  for (const path of ["/en", "/ckb", "/en/sign-up", "/ar/jobs"]) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of ["/en", "/ckb", "/ar/sign-in", "/en/sign-up", "/kmr/forgot-password", "/en/jobs"]) {
    test(`no serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
