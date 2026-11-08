import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Trust & safety journey with three CONFIRMED, onboarded accounts against a real Supabase project:
 *   E2E_FREELANCER_EMAIL (freelancer, has a username = E2E_FREELANCER_USERNAME), E2E_CLIENT_EMAIL (client),
 *   E2E_MODERATOR_EMAIL (holds the "moderator" role), all with E2E_PASSWORD. See docs/testing.md. Desktop only, serial.
 * Covers: request → conversation → unread badge → reply → completion → two-sided blind reviews → public rating
 * → reporting a message → moderator sees only the reported copy → hides it → client sees it removed.
 */
const F = process.env.E2E_FREELANCER_EMAIL;
const C = process.env.E2E_CLIENT_EMAIL;
const M = process.env.E2E_MODERATOR_EMAIL;
const PW = process.env.E2E_PASSWORD;
const USERNAME = process.env.E2E_FREELANCER_USERNAME;

test.describe.configure({ mode: "serial" });
test.skip(!F || !C || !M || !PW || !USERNAME, "trust e2e credentials not set");
test.skip(({ isMobile }) => isMobile, "desktop only");

const stamp = Date.now().toString(36);
const SERVICE = `Kurdish subtitles for short videos ${stamp}`;

async function signIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/en/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PW!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  return page;
}

test("message, complete, review both ways, report and moderate", async ({ browser }) => {
  test.setTimeout(150_000);
  const freelancer = await signIn(browser, F!);

  // Freelancer publishes a service.
  await freelancer.goto("/en/dashboard/services/new");
  await freelancer.getByLabel("Title").fill(SERVICE);
  await freelancer.getByLabel("Category").selectOption("video");
  await freelancer.getByLabel("Description").fill("Accurate Sorani and Badini subtitles for reels, ads and interviews, delivered as SRT files.");
  await freelancer.locator("#basic_title").fill("Up to 3 minutes");
  await freelancer.locator("#basic_price").fill("40000");
  await freelancer.locator("#basic_deliveryDays").fill("2");
  await freelancer.getByRole("button", { name: "Publish" }).click();
  await expect(freelancer.getByText("Published. It's now visible to everyone.")).toBeVisible();
  const serviceId = freelancer.url().match(/services\/([0-9a-f-]{36})/)![1];

  // Client requests it; a conversation opens automatically.
  const client = await signIn(browser, C!);
  await client.goto(`/en/services/${serviceId}`);
  await client.getByLabel("Message to the freelancer").fill(`We need subtitles for a 2-minute café ad (${stamp}).`);
  await client.getByRole("button", { name: "Request this package" }).click();
  await expect(client.getByText("Request sent.")).toBeVisible();

  await client.goto("/en/dashboard/requests?side=sent");
  const sent = client.locator("li").filter({ hasText: `(${stamp})` });
  await sent.getByRole("link", { name: "Message" }).click();
  await expect(client).toHaveURL(/\/en\/dashboard\/messages\/[0-9a-f-]{36}/);
  const threadUrl = client.url().replace(/#.*$/, "");
  await expect(client.getByText("Moderators can't read your conversations.", { exact: false })).toBeVisible();
  await client.getByLabel("Your message").fill(`Can you also burn the subtitles into the video? ${stamp}`);
  await client.getByRole("button", { name: "Send" }).click();
  await expect(client.getByText(`burn the subtitles into the video? ${stamp}`)).toBeVisible();
  await expect(client.getByLabel("Your message")).toHaveValue("");

  // Freelancer sees an unread badge, opens the thread (which marks it read) and replies.
  await freelancer.goto("/en/dashboard/messages");
  await expect(freelancer.getByRole("navigation", { name: "Dashboard sections" }).getByText("Unread conversations: 1")).toBeAttached();
  const row = freelancer.getByRole("link").filter({ hasText: `burn the subtitles into the video? ${stamp}` });
  await expect(row.getByText("New")).toBeVisible();
  await row.click();
  await freelancer.getByLabel("Your message").fill("Yes, burned-in subtitles are included at no extra cost.");
  await freelancer.getByRole("button", { name: "Send" }).click();
  await expect(freelancer.getByText("burned-in subtitles are included")).toBeVisible();
  await freelancer.goto("/en/dashboard/messages");
  await expect(freelancer.getByText("Unread conversations:", { exact: false })).toHaveCount(0);

  // Freelancer accepts and completes the request.
  await freelancer.goto("/en/dashboard/requests");
  const received = freelancer.locator("li").filter({ hasText: `(${stamp})` });
  await received.getByRole("button", { name: "Accept" }).click();
  await expect(received.getByRole("button", { name: "Mark completed" })).toBeVisible();
  await received.getByRole("button", { name: "Mark completed" }).click();
  await expect(received.getByRole("button", { name: "Leave a review" })).toBeVisible();

  // Client reviews first: hidden from the public until the freelancer also reviews (blind reviews).
  await client.goto("/en/dashboard/requests?side=sent");
  const done = client.locator("li").filter({ hasText: `(${stamp})` });
  await done.getByRole("button", { name: "Leave a review" }).click();
  await done.getByText("5 — Excellent").click();
  await done.getByLabel("How was it working together?").fill(`Fast, accurate subtitles and kind communication. ${stamp}`);
  await done.getByRole("button", { name: "Publish review" }).click();
  await expect(done.getByText("You reviewed this")).toBeVisible();
  await expect(done.getByText("Reviews stay hidden until both sides have written one", { exact: false })).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/en/services/${serviceId}`);
  await expect(visitor.getByText(`kind communication. ${stamp}`)).toHaveCount(0);

  await freelancer.goto("/en/dashboard/requests");
  const toReview = freelancer.locator("li").filter({ hasText: `(${stamp})` });
  await toReview.getByRole("button", { name: "Leave a review" }).click();
  await toReview.getByRole("button", { name: "Publish review" }).click();
  await expect(toReview.locator("#rating-error")).toHaveText("Choose a rating from 1 to 5.");
  await toReview.getByText("4 — Very good").click();
  await toReview.getByRole("button", { name: "Publish review" }).click();
  await expect(toReview.getByText("You reviewed this")).toBeVisible();

  // Both reviews are now public; the service shows its rating.
  await visitor.goto(`/en/services/${serviceId}`);
  await expect(visitor.getByText(`kind communication. ${stamp}`)).toBeVisible();
  await expect(visitor.getByText("Rated 5.0 out of 5").first()).toBeAttached();
  await visitor.goto(`/en/u/${USERNAME}`);
  await expect(visitor.getByText(`kind communication. ${stamp}`)).toBeVisible();

  // Client reports the freelancer's message.
  await client.goto(threadUrl);
  const theirs = client.locator("li").filter({ hasText: "burned-in subtitles are included" });
  await theirs.locator("summary").click();
  await theirs.getByLabel("Reason").selectOption("offensive");
  await theirs.getByLabel("Details").fill(`Test report ${stamp}`);
  await theirs.getByRole("button", { name: "Send report" }).click();
  await expect(theirs.getByText("A moderator will look at it.", { exact: false })).toBeVisible();

  // A moderator sees the report with the copied text, but cannot open the conversation itself.
  const moderator = await signIn(browser, M!);
  // (The dashboard streams a loading state first, so the HTTP status is 200; the content is the not-found page.)
  await moderator.goto(threadUrl);
  await expect(moderator.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(moderator.getByText("burned-in subtitles are included")).toHaveCount(0);
  await moderator.goto("/en/admin/reports");
  const report = moderator.locator("li").filter({ hasText: `Test report ${stamp}` });
  await expect(report.getByText("burned-in subtitles are included")).toBeVisible();
  await report.getByLabel("Note for the log (optional)").fill(`e2e ${stamp}`);
  await report.getByRole("button", { name: "Hide" }).click();
  await expect(moderator.locator("li").filter({ hasText: `Test report ${stamp}` })).toHaveCount(0);
  await moderator.goto("/en/admin/log");
  await expect(moderator.getByText(`e2e ${stamp}`)).toBeVisible();

  // The client now sees the message as removed.
  await client.goto(threadUrl);
  await expect(client.getByText("This message was removed by a moderator.")).toBeVisible();
  await expect(client.getByText("burned-in subtitles are included")).toHaveCount(0);

  // A non-staff member gets a 404 for the moderation area.
  const denied = await client.goto("/en/admin/reports");
  expect(denied?.status()).toBe(404);
});
