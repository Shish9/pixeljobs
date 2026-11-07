import { describe, expect, it } from "vitest";
import { htmlToBlocks, safeExternalUrl } from "@/lib/text";
import { profileCompletion } from "@/lib/profile";

describe("htmlToBlocks", () => {
  it("turns legacy HTML into escaped text blocks and drops scripts", () => {
    const blocks = htmlToBlocks(
      `<p>Hello &amp; welcome</p><script>alert(1)</script><ul><li>Figma</li><li><strong>Adobe</strong> XD</li></ul><img src=x onerror=alert(1)>`,
    );
    expect(blocks).toEqual([
      { type: "p", text: "Hello & welcome" },
      { type: "li", text: "Figma" },
      { type: "li", text: "Adobe XD" },
    ]);
  });
});

describe("safeExternalUrl", () => {
  it("allows only http(s)", () => {
    expect(safeExternalUrl("https://example.com/apply")).toBe("https://example.com/apply");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,x")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
  });
});

describe("profileCompletion", () => {
  const empty = { display_name: "", username: null, headline: null, bio: null, avatar_path: null, city: null, is_freelancer: false, is_client: false };
  it("is 0 for an empty profile and 100 for a complete one", () => {
    expect(profileCompletion(empty).percent).toBe(0);
    expect(
      profileCompletion({
        display_name: "Aram", username: "aram", headline: "Designer", bio: "x".repeat(40),
        avatar_path: "u/a.png", city: "erbil", is_freelancer: true, is_client: false,
      }),
    ).toEqual({ percent: 100, missing: [] });
  });
  it("lists missing items", () => {
    const r = profileCompletion({ ...empty, display_name: "Aram", username: "aram", is_client: true });
    expect(r.percent).toBe(40);
    expect(r.missing).toEqual(["avatar", "headline", "bio", "city"]);
  });
});
