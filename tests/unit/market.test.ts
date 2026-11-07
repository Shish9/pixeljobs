import { describe, expect, it } from "vitest";
import {
  iqdAmount,
  normalizeDigits,
  packageSchema,
  projectSchema,
  proposalSchema,
  splitList,
  fieldErrors,
} from "@/lib/validation";
import { CLIENT_PROPOSAL_ACTIONS, FREELANCER_REQUEST_ACTIONS, PROJECT_TRANSITIONS } from "@/lib/taxonomy";
import { readFilters } from "@/lib/filters";
import { dbErrorKey } from "@/lib/db-errors";

describe("number input from Kurdish/Arabic keyboards", () => {
  it("normalizes Arabic-Indic and Persian digits and separators", () => {
    expect(normalizeDigits("١٥٠٬٠٠٠")).toBe("150000");
    expect(normalizeDigits("۲۵۰,۰۰۰")).toBe("250000");
    expect(normalizeDigits("1 200 000")).toBe("1200000");
  });
  it("parses IQD amounts into minor units and rejects junk", () => {
    expect(iqdAmount.parse("١٥٠٬٠٠٠")).toBe(150000);
    expect(iqdAmount.safeParse("abc").success).toBe(false);
    expect(iqdAmount.safeParse("0").success).toBe(false);
    expect(iqdAmount.safeParse("-5").success).toBe(false);
  });
  it("splits lists on commas, Arabic commas and new lines, de-duplicated and capped", () => {
    expect(splitList("Logo, Figma، Branding\nLogo", 10, 40)).toEqual(["Logo", "Figma", "Branding"]);
    expect(splitList("a,b,c,d", 2, 40)).toEqual(["a", "b"]);
  });
});

describe("marketplace schemas", () => {
  it("validates a package", () => {
    const ok = packageSchema.safeParse({ tier: "basic", title: "Logo", price: "١٥٠٠٠٠", deliveryDays: "5", revisions: "2", deliverables: "PNG, SVG" });
    expect(ok.success && ok.data).toMatchObject({ price: 150000, deliveryDays: 5, revisions: 2, deliverables: ["PNG", "SVG"] });
    const bad = packageSchema.safeParse({ tier: "basic", title: "L", price: "x", deliveryDays: "500", revisions: "1" });
    expect(!bad.success && Object.keys(fieldErrors(bad.error)).sort()).toEqual(["deliveryDays", "price", "title"]);
  });
  it("checks project budget ranges", () => {
    const base = { title: "Instagram content", description: "x".repeat(40), category: "marketing", budgetType: "fixed", timeline: "1_4w", experienceLevel: "entry", visibility: "public" };
    expect(projectSchema.safeParse({ ...base, budgetMin: "500000", budgetMax: "400000" }).success).toBe(false);
    const ok = projectSchema.safeParse({ ...base, budgetMin: "", budgetMax: "٧٠٠٠٠٠", city: "erbil" });
    expect(ok.success && ok.data).toMatchObject({ budgetMin: null, budgetMax: 700000, city: "erbil" });
  });
  it("requires a real proposal", () => {
    const p = { projectId: "4b5e6f9a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", coverLetter: "short", bid: "1000", timelineDays: "7", portfolioItemIds: [] };
    expect(proposalSchema.safeParse(p).success).toBe(false);
    expect(proposalSchema.safeParse({ ...p, coverLetter: "y".repeat(60) }).success).toBe(true);
    expect(proposalSchema.safeParse({ ...p, coverLetter: "y".repeat(60), projectId: "nope" }).success).toBe(false);
  });
});

describe("status rules mirror the database triggers", () => {
  it("never lets a client move a project back to open after assignment", () => {
    expect(PROJECT_TRANSITIONS.assigned).not.toContain("open");
    expect(PROJECT_TRANSITIONS.draft).toEqual(["open", "cancelled"]);
  });
  it("only the client can accept proposals; freelancers only withdraw", () => {
    expect(CLIENT_PROPOSAL_ACTIONS.submitted).toContain("accepted");
    expect(CLIENT_PROPOSAL_ACTIONS.accepted).toEqual([]);
    expect(FREELANCER_REQUEST_ACTIONS.pending).toEqual(["accepted", "declined"]);
  });
});

describe("browse filters", () => {
  it("whitelists query-string filters", () => {
    expect(readFilters({ category: "design", city: "atlantis", lang: "ckb", max: "١٠٠٠٠٠", q: "  logo  " })).toMatchObject({
      q: "logo", category: "design", city: undefined, lang: "ckb", maxPrice: 100000,
    });
    expect(readFilters({ category: "hacking", max: "1e9" })).toMatchObject({ category: undefined, maxPrice: null });
  });
});

describe("database error mapping", () => {
  const e = (message: string, code = "P0001") => ({ message, code, details: "", hint: "", name: "PostgrestError" }) as never;
  it("maps trigger codes to friendly messages", () => {
    expect(dbErrorKey(e("email_not_confirmed"))).toBe("errors.actionEmail");
    expect(dbErrorKey(e("service_needs_package"))).toBe("errors.packageRequired");
    expect(dbErrorKey(e("rate_limited"))).toBe("errors.rateLimited");
    expect(dbErrorKey(e("anything", "42501"))).toBe("errors.forbidden");
    expect(dbErrorKey(e("dup", "23505"))).toBe("errors.duplicate");
    expect(dbErrorKey(e("internal detail leak"))).toBe("errors.generic");
  });
});
