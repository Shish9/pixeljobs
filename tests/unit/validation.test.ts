import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  onboardingSchema,
  passwordSchema,
  profileSchema,
  resetPasswordSchema,
  safeRedirectPath,
  signUpSchema,
  sniffImageType,
  usernameSchema,
} from "@/lib/validation";
import { toMinorUnits } from "@/lib/currency";

describe("auth schemas", () => {
  it("requires letters and numbers in passwords", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("longpassword").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("hewler2026").success).toBe(true);
    expect(passwordSchema.safeParse("هەولێر12345").success).toBe(true);
  });

  it("normalises email and reports field errors as message keys", () => {
    const ok = signUpSchema.safeParse({ displayName: "Aram", email: "  ARAM@Example.com ", password: "hewler2026" });
    expect(ok.success && ok.data.email).toBe("aram@example.com");
    const bad = signUpSchema.safeParse({ displayName: "", email: "nope", password: "x" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(fieldErrors(bad.error)).toEqual({
        displayName: "validation.tooShort",
        email: "validation.email",
        password: "validation.passwordLength",
      });
    }
  });

  it("checks password confirmation", () => {
    const r = resetPasswordSchema.safeParse({ password: "hewler2026", confirmPassword: "hewler2027" });
    expect(!r.success && fieldErrors(r.error)).toEqual({ confirmPassword: "validation.passwordMatch" });
  });
});

describe("usernames and onboarding", () => {
  it("enforces format and reserved names", () => {
    expect(usernameSchema.safeParse("aram.design").success).toBe(true);
    expect(usernameSchema.safeParse("Aram_K").data).toBe("aram_k");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse(".aram").success).toBe(false);
    expect(usernameSchema.safeParse("aram.").success).toBe(false);
    expect(usernameSchema.safeParse("ئارام").success).toBe(false);
    expect(usernameSchema.safeParse("admin").success).toBe(false);
  });

  it("needs at least one marketplace mode, and nothing else", () => {
    expect(onboardingSchema.safeParse({ isClient: null, isFreelancer: null, city: "" }).success).toBe(false);
    const ok = onboardingSchema.safeParse({ isClient: "on", isFreelancer: null, city: "erbil" });
    expect(ok.success && ok.data).toMatchObject({ isClient: true, isFreelancer: false, city: "erbil" });
    expect(onboardingSchema.safeParse({ isFreelancer: "on", city: "" }).success).toBe(true);
    expect(onboardingSchema.safeParse({ isFreelancer: "on", city: "atlantis" }).success).toBe(false);
  });

  it("treats the settings username as optional but validated", () => {
    const base = { displayName: "Aram", headline: "", bio: "", city: "" };
    expect(profileSchema.safeParse({ ...base, username: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, username: "aram.k" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, username: "a" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, username: "admin" }).success).toBe(false);
  });
});

describe("security helpers", () => {
  it("only allows same-origin relative redirects", () => {
    expect(safeRedirectPath("/en/dashboard", "/x")).toBe("/en/dashboard");
    expect(safeRedirectPath("//evil.com", "/x")).toBe("/x");
    expect(safeRedirectPath("https://evil.com", "/x")).toBe("/x");
    expect(safeRedirectPath("/\\evil.com", "/x")).toBe("/x");
    expect(safeRedirectPath("/en\r\nSet-Cookie:a", "/x")).toBe("/x");
    expect(safeRedirectPath(undefined, "/x")).toBe("/x");
  });

  it("sniffs image types from magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });

  it("converts currency amounts to minor units", () => {
    expect(toMinorUnits(250000, "IQD")).toBe(250000);
    expect(toMinorUnits(12.34, "USD")).toBe(1234);
  });
});
