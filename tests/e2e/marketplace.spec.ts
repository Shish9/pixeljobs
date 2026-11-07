import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Two-person marketplace journey against a real Supabase project. Requires two CONFIRMED, onboarded test accounts:
 *   E2E_FREELANCER_EMAIL (freelancer mode, has a username), E2E_CLIENT_EMAIL (client mode), E2E_PASSWORD,
 *   E2E_FREELANCER_USERNAME. See docs/testing.md for creating and deleting them. Desktop only, serial.
 */
const F = process.env.E2E_FREELANCER_EMAIL;
const C = process.env.E2E_CLIENT_EMAIL;
const PW = process.env.E2E_PASSWORD;
const USERNAME = process.env.E2E_FREELANCER_USERNAME;

test.describe.configure({ mode: "serial" });
test.skip(!F || !C || !PW || !USERNAME, "marketplace e2e credentials not set");
test.skip(({ isMobile }) => isMobile, "desktop only");

const stamp = Date.now().toString(36);
const SERVICE = `Bilingual logo design ${stamp}`;
const PROJECT = `Instagram content for a café ${stamp}`;

async function signIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/en/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PW!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  return page;
}

test("freelancer publishes, client requests and posts, freelancer proposes, client hires", async ({ browser }) => {
  test.setTimeout(120_000);
  const freelancer = await signIn(browser, F!);

  // Publishing without the Basic package is refused with a clear message.
  await freelancer.goto("/en/dashboard/services/new");
  await freelancer.getByLabel("Title").fill(SERVICE);
  await freelancer.getByLabel("Category").selectOption("design");
  await freelancer.getByLabel("Description").fill("Clear, bilingual logos in Kurdish and English for cafés, shops and clinics in Erbil.");
  await freelancer.getByRole("button", { name: "Publish" }).click();
  await expect(freelancer.locator("#basic_title-error")).toHaveText("Add the Basic package before publishing.");

  // Nothing typed is lost after a validation error.
  await expect(freelancer.getByLabel("Title")).toHaveValue(SERVICE);
  await expect(freelancer.getByLabel("Category")).toHaveValue("design");

  // Full service with Arabic-Indic digits in the price.
  await freelancer.getByText("Kurdish (Sorani)").click();
  await freelancer.locator("#basic_title").fill("Logo");
  await freelancer.locator("#basic_price").fill("١٥٠٬٠٠٠");
  await freelancer.locator("#basic_deliveryDays").fill("5");
  await freelancer.locator("#standard_title").fill("Logo + brand kit");
  await freelancer.locator("#standard_price").fill("350000");
  await freelancer.locator("#standard_deliveryDays").fill("7");
  await freelancer.locator("#standard_deliverables").fill("Two concepts\nPNG, SVG, PDF");
  await freelancer.locator("#faq_q_0").fill("Can you do Badini too?");
  await freelancer.locator("#faq_a_0").fill("Yes, ask before requesting.");
  await freelancer.getByRole("button", { name: "Publish" }).click();
  await expect(freelancer.getByText("Published. It's now visible to everyone.")).toBeVisible();

  // Portfolio item + profile details.
  await freelancer.goto("/en/dashboard/portfolio");
  await freelancer.getByLabel("Title").fill(`Ankawa bakery logo ${stamp}`);
  await freelancer.getByRole("button", { name: "Add" }).click();
  await expect(freelancer.getByText(`Ankawa bakery logo ${stamp}`)).toBeVisible();
  await freelancer.goto("/en/dashboard/profile");
  await freelancer.getByLabel("Skills").fill("Logo design, Branding، Figma");
  await freelancer.getByLabel("Typical rate (IQD)").fill("100000");
  await freelancer.getByRole("button", { name: "Save changes" }).click();
  await expect(freelancer.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  // Client finds the service and requests the Standard package.
  const client = await signIn(browser, C!);
  await client.goto(`/en/services?q=${encodeURIComponent("bilingual")}`);
  await client.getByRole("link", { name: SERVICE }).click();
  await expect(client.getByRole("heading", { level: 1, name: SERVICE })).toBeVisible();
  await expect(client.getByText("Can you do Badini too?")).toBeVisible();
  await client.getByRole("button", { name: "Save", exact: true }).click();
  await expect(client.getByRole("button", { name: "Saved" })).toBeVisible();
  await client.getByLabel("Message to the freelancer").fill(`Hello! We are opening a café in Ankawa and need a logo in two languages (${stamp}).`);
  await client.getByRole("button", { name: "Request this package" }).click();
  await expect(client.getByText("Request sent.")).toBeVisible();

  // Client posts a project.
  await client.goto("/en/dashboard/projects/new");
  await client.getByLabel("Title").fill(PROJECT);
  await client.getByLabel("Description").fill("Weekly photos and captions in Kurdish and Arabic for our new café for one month.");
  await client.getByLabel("Category").selectOption("marketing");
  await client.getByLabel("Budget from (IQD)").fill("400000");
  await client.getByLabel("Budget to (IQD)").fill("300000");
  await client.getByRole("button", { name: "Publish" }).click();
  await expect(client.locator("#budgetMax-error")).toHaveText("The maximum can't be less than the minimum.");
  await expect(client.getByLabel("Title")).toHaveValue(PROJECT);
  await client.getByLabel("Budget to (IQD)").fill("700000");
  await client.getByRole("button", { name: "Publish" }).click();
  await expect(client.getByText("Published. It's now visible to everyone.")).toBeVisible();
  const projectUrl = client.url().replace(/\?.*$/, "");

  // Freelancer accepts the request and sends a proposal with portfolio work attached.
  await freelancer.goto("/en/dashboard/requests");
  const request = freelancer.locator("li").filter({ hasText: `(${stamp})` });
  await expect(request).toBeVisible();
  await request.getByRole("button", { name: "Accept" }).click();
  await expect(request.getByText("Accepted")).toBeVisible();
  await expect(request.getByRole("button", { name: "Mark completed" })).toBeVisible();
  await freelancer.goto(`/en/projects?q=${encodeURIComponent("Instagram")}`);
  await freelancer.getByRole("link", { name: PROJECT }).click();
  await freelancer.getByLabel("Cover letter").fill(`I have shot café content in Erbil for two years and write captions in Sorani and Arabic. ${stamp}`);
  await freelancer.getByLabel("Your price (IQD)").fill("550000");
  await freelancer.getByLabel("Time needed (days)").fill("28");
  await freelancer.getByText(`Ankawa bakery logo ${stamp}`).click();
  await freelancer.getByRole("button", { name: "Send a proposal" }).click();
  await expect(freelancer.getByText("Proposal sent.")).toBeVisible();

  // Client reviews: shortlist, then accept → project becomes Assigned.
  await client.goto(projectUrl);
  await expect(client.getByText(`write captions in Sorani and Arabic. ${stamp}`)).toBeVisible();
  await client.getByRole("button", { name: "Shortlist" }).click();
  await expect(client.getByText("Shortlisted")).toBeVisible();
  await client.getByRole("button", { name: "Accept" }).click();
  await expect(client.getByText("Assigned").first()).toBeVisible();

  // Freelancer sees the result; client's saved list holds the service.
  await freelancer.goto("/en/dashboard/proposals");
  await expect(freelancer.getByText("Accepted").first()).toBeVisible();
  await client.goto("/en/dashboard/saved");
  await expect(client.getByRole("link", { name: SERVICE })).toBeVisible();

  // Anyone can see the public profile with the service and portfolio.
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/en/u/${USERNAME}`);
  await expect(visitor.getByRole("link", { name: SERVICE })).toBeVisible();
  await expect(visitor.getByText(`Ankawa bakery logo ${stamp}`)).toBeVisible();
  await expect(visitor.getByText("Figma")).toBeVisible();
});
