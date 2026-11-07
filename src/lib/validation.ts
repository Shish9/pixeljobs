import { z } from "zod";
import { locales } from "@/i18n/config";
import { currencies } from "@/lib/currency";
import type { MessageKey } from "@/i18n/translate";

/**
 * Shared schemas used by server actions (authoritative) and mirrored by HTML constraints on the client.
 * Error messages are dictionary keys, translated at render time.
 */
const msg = (key: MessageKey) => ({ message: key });

export const CITY_KEYS = [
  "erbil", "sulaymaniyah", "duhok", "halabja", "kirkuk", "baghdad", "basra", "mosul", "najaf", "karbala",
] as const;

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "moderator", "staff", "support", "help", "root", "system", "pixeljobs", "api",
  "auth", "settings", "dashboard", "onboarding", "jobs", "services", "projects", "messages", "null", "undefined",
]);

const trimmed = z.string().trim();

export const emailSchema = trimmed.toLowerCase().min(1, msg("validation.required")).max(254).email(msg("validation.email"));

export const passwordSchema = z
  .string()
  .min(8, msg("validation.passwordLength"))
  .max(72, msg("validation.tooLong"))
  .refine((v) => /[A-Za-z؀-ۿ]/.test(v) && /\d/.test(v), msg("validation.passwordStrength"));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, msg("validation.required")).max(72),
});

export const signUpSchema = z.object({
  displayName: trimmed.min(2, msg("validation.tooShort")).max(80, msg("validation.tooLong")),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { ...msg("validation.passwordMatch"), path: ["confirmPassword"] });

export const usernameSchema = trimmed
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/, msg("validation.username"))
  .refine((v) => !RESERVED_USERNAMES.has(v), msg("errors.usernameTaken"));

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const onboardingSchema = z
  .object({
    isClient: checkbox,
    isFreelancer: checkbox,
    city: z.enum([...CITY_KEYS, "other"]).optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.isClient || v.isFreelancer, { ...msg("validation.pickRole"), path: ["roles"] });

export const profileSchema = z.object({
  displayName: trimmed.min(2, msg("validation.tooShort")).max(80, msg("validation.tooLong")),
  username: z.literal("").transform(() => undefined).or(usernameSchema).optional(),
  headline: trimmed.max(120, msg("validation.tooLong")).optional().default(""),
  bio: trimmed.max(2000, msg("validation.tooLong")).optional().default(""),
  city: z.enum([...CITY_KEYS, "other"]).optional().or(z.literal("").transform(() => undefined)),
});

export const preferencesSchema = z.object({
  preferredLocale: z.enum(locales),
  preferredCurrency: z.enum(Object.keys(currencies) as [keyof typeof currencies, ...(keyof typeof currencies)[]]),
  digitStyle: z.enum(["native", "latin"]),
  isClient: checkbox,
  isFreelancer: checkbox,
});

export const privacySchema = z.object({
  visibility: z.enum(["public", "private"]),
  marketingEmails: checkbox,
});

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Verify the file's magic bytes match its declared image type (don't trust the browser-supplied MIME type). */
export function sniffImageType(bytes: Uint8Array): keyof typeof AVATAR_TYPES | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

/** Flatten zod issues into `{ field: messageKey }` (first issue per field wins). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in out)) out[field] = issue.message;
  }
  return out;
}

/** Only allow same-origin relative redirects ("/en/dashboard"), never "//evil.com" or absolute URLs. */
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}
