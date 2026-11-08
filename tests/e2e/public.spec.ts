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

test.describe("marketplace browse", () => {
  test("services and projects pages render with filters", async ({ page }) => {
    await page.goto("/en/services?category=design&city=atlantis&max=abc");
    await expect(page.getByRole("heading", { level: 1, name: "Services" })).toBeVisible();
    await expect(page.getByLabel("Category")).toHaveValue("design");
    await expect(page.getByLabel("City")).toHaveValue("");
    await page.goto("/en/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  });
  test("unknown ids and usernames return 404", async ({ page }) => {
    expect((await page.goto("/en/services/00000000-0000-0000-0000-000000000000"))?.status()).toBe(404);
    expect((await page.goto("/en/projects/not-a-uuid"))?.status()).toBe(404);
    expect((await page.goto("/en/u/nobody.here"))?.status()).toBe(404);
  });
});

test.describe("access control", () => {
  for (const path of ["dashboard", "settings", "onboarding", "admin", "dashboard/services/new", "dashboard/projects", "dashboard/messages", "admin/reports"]) {
    test(`/${path} requires sign-in`, async ({ page }) => {
      await page.goto(`/en/${path}`);
      await expect(page).toHaveURL(new RegExp(`/en/sign-in\\?next=%2Fen%2F${path.replaceAll("/", "%2F")}`));
    });
  }

  test("auth callback with a bad code fails safely", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid&next=https://evil.example");
    await expect(page).toHaveURL(/\/sign-in\?error=link$/);
  });
});

test.describe("search", () => {
  test("city picker works with the keyboard and the search submits", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /any city/ }).click();
    const filter = page.getByRole("combobox", { name: "Find a city" });
    await expect(filter).toBeFocused();
    await filter.fill("duh");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /Duhok/ })).toBeFocused();
    await page.getByLabel("I need").fill("logo");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/en\/search\?q=logo&city=duhok$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("“logo” in Duhok");
    await expect(page.getByRole("heading", { name: /^Services/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Projects/ })).toBeVisible();
  });

  test("city picker closes with Escape and shows an empty state", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /any city/ }).click();
    await page.getByRole("combobox", { name: "Find a city" }).fill("zzz");
    await expect(page.getByText("No city matches “zzz”.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox", { name: "Find a city" })).toHaveCount(0);
  });

  test("unknown city values fall back to any city", async ({ page }) => {
    await page.goto("/en/search?city=atlantis");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Freelancers and jobs: any city");
  });

  test("mobile tab bar shows on phones only", async ({ page, isMobile }) => {
    await page.goto("/ckb");
    const tabs = page.locator("nav.fixed");
    if (isMobile) {
      await expect(tabs).toBeVisible();
      await tabs.getByRole("link", { name: "گەڕان" }).click();
      await expect(page).toHaveURL(/\/ckb\/search$/);
      await expect(tabs.getByRole("link", { name: "گەڕان" })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(tabs).toBeHidden();
    }
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

test.describe("policies", () => {
  for (const l of LOCALES) {
    test(`policy pages render in ${l.code} with the draft notice`, async ({ page }) => {
      for (const path of ["guidelines", "terms", "privacy", "safety"]) {
        const res = await page.goto(`/${l.code}/${path}`);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("status").first()).toBeVisible();
      }
    });
  }

  test("footer links to the policies and the sign-up page mentions the terms", async ({ page }) => {
    await page.goto("/en/sign-up");
    await expect(page.getByRole("main").getByRole("link", { name: "Terms of use" })).toBeVisible();
    await page.getByRole("contentinfo").getByRole("link", { name: "Safety tips" }).click();
    await expect(page).toHaveURL(/\/en\/safety$/);
    await expect(page.getByText("PixelJobs does not hold payments or offer escrow yet.", { exact: false })).toBeVisible();
  });
});

test.describe("layout", () => {
  for (const path of ["/en", "/ckb", "/kmr", "/ar", "/en/sign-up", "/ar/jobs", "/kmr/search?q=logo&city=duhok", "/kmr/services", "/ar/projects", "/ckb/terms", "/kmr/safety"]) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of ["/en", "/ckb", "/ar/sign-in", "/en/sign-up", "/kmr/forgot-password", "/en/jobs", "/ar/search?q=logo&city=erbil", "/en/services", "/ckb/projects", "/en/guidelines", "/ar/privacy"]) {
    test(`no serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
