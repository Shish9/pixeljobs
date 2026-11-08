import { z } from "zod";
import { locales } from "@/i18n/config";
import { currencies, toMinorUnits } from "@/lib/currency";
import { AVAILABILITY, BUDGET_TYPES, CATEGORY_KEYS, ENTRY_KINDS, EXPERIENCE_LEVELS, LANG_KEYS, TIERS, TIMELINES } from "@/lib/taxonomy";
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

// ---------------------------------------------------------------------------------------------------------------
// Marketplace (Phase 6)
// ---------------------------------------------------------------------------------------------------------------

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Western, thousands separators removed. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[,٬،\s]/g, "")
    .replace(/٫/g, ".");
}

/** "Logo, Branding، Figma" → ["Logo", "Branding", "Figma"] (comma, Arabic comma or new line). */
export function splitList(value: unknown, max: number, maxLen: number): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, max).map((s) => s.slice(0, maxLen));
}

const optionalText = (max: number) =>
  z.string().trim().max(max, msg("validation.tooLong")).optional().transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .max(300, msg("validation.tooLong"))
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/\S+$/.test(v), msg("validation.url"));

/** Major-unit IQD amount typed by a person → integer minor units. */
export const iqdAmount = z
  .string()
  .transform((v) => normalizeDigits(v))
  .refine((v) => /^\d{1,12}$/.test(v), msg("validation.amount"))
  .transform((v) => toMinorUnits(Number(v), "IQD"))
  .refine((v) => v > 0, msg("validation.amount"));

const optionalIqd = z
  .string()
  .optional()
  .transform((v) => (v ? normalizeDigits(v) : ""))
  .refine((v) => v === "" || /^\d{1,12}$/.test(v), msg("validation.amount"))
  .transform((v) => (v === "" ? null : toMinorUnits(Number(v), "IQD")));

const intIn = (min: number, max: number) =>
  z
    .string()
    .transform((v) => normalizeDigits(v))
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, msg("validation.number"))
    .transform(Number);

const optionalYear = z
  .string()
  .optional()
  .transform((v) => (v ? normalizeDigits(v) : ""))
  .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), msg("validation.year"))
  .transform((v) => (v === "" ? null : Number(v)));

const cityOrNull = z.enum([...CITY_KEYS, "other"]).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null);

export const profileDetailsSchema = z.object({
  skills: z.string().optional().transform((v) => splitList(v, 15, 40)),
  languages: z.array(z.enum(LANG_KEYS)).max(6),
  availability: z.enum(AVAILABILITY),
  rate: optionalIqd,
  websiteUrl: optionalUrl,
});

export const entrySchema = z
  .object({
    kind: z.enum(ENTRY_KINDS),
    title: trimmed.min(2, msg("validation.tooShort")).max(120, msg("validation.tooLong")),
    organization: optionalText(120),
    startYear: optionalYear,
    endYear: optionalYear,
    description: optionalText(1000),
  })
  .refine((v) => v.endYear === null || v.startYear === null || v.endYear >= v.startYear, { ...msg("validation.years"), path: ["endYear"] });

export const portfolioSchema = z.object({
  title: trimmed.min(2, msg("validation.tooShort")).max(120, msg("validation.tooLong")),
  description: optionalText(2000),
  linkUrl: optionalUrl,
  skills: z.string().optional().transform((v) => splitList(v, 10, 40)),
  outcome: optionalText(300),
});

export const serviceSchema = z.object({
  title: trimmed.min(10, msg("validation.tooShort")).max(100, msg("validation.tooLong")),
  category: z.enum(CATEGORY_KEYS, msg("validation.required")),
  description: trimmed.max(5000, msg("validation.tooLong")),
  requirements: optionalText(2000),
  city: cityOrNull,
  languages: z.array(z.enum(LANG_KEYS)).max(6),
});

export const packageSchema = z.object({
  tier: z.enum(TIERS),
  title: trimmed.min(2, msg("validation.tooShort")).max(60, msg("validation.tooLong")),
  description: optionalText(500),
  price: iqdAmount,
  deliveryDays: intIn(1, 120),
  revisions: intIn(0, 20),
  deliverables: z.string().optional().transform((v) => splitList(v, 10, 120)),
});

export const faqSchema = z
  .array(z.object({ q: trimmed.max(200), a: trimmed.max(1000) }))
  .transform((items) => items.filter((f) => f.q && f.a).slice(0, 10));

export const requestSchema = z.object({
  serviceId: z.uuid(),
  tier: z.enum(TIERS),
  message: trimmed.min(20, msg("validation.tooShort")).max(2000, msg("validation.tooLong")),
});

export const projectSchema = z
  .object({
    title: trimmed.min(10, msg("validation.tooShort")).max(120, msg("validation.tooLong")),
    description: trimmed.min(30, msg("validation.tooShort")).max(5000, msg("validation.tooLong")),
    category: z.enum(CATEGORY_KEYS, msg("validation.required")),
    skills: z.string().optional().transform((v) => splitList(v, 10, 40)),
    budgetType: z.enum(BUDGET_TYPES),
    budgetMin: optionalIqd,
    budgetMax: optionalIqd,
    timeline: z.enum(TIMELINES),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    city: cityOrNull,
    visibility: z.enum(["public", "members"]),
  })
  .refine((v) => v.budgetMin === null || v.budgetMax === null || v.budgetMax >= v.budgetMin, {
    ...msg("validation.budgetRange"),
    path: ["budgetMax"],
  });

export const proposalSchema = z.object({
  projectId: z.uuid(),
  coverLetter: trimmed.min(50, msg("validation.tooShort")).max(5000, msg("validation.tooLong")),
  bid: iqdAmount,
  timelineDays: intIn(1, 365),
  portfolioItemIds: z.array(z.uuid()).max(5),
  answers: optionalText(2000),
});

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------------------------------------------
// Trust & safety (Phase 7)
// ---------------------------------------------------------------------------------------------------------------
export const REPORT_TARGETS = ["user", "service", "project", "portfolio", "message", "review"] as const;
export const REPORT_REASONS = ["spam", "scam", "offensive", "inappropriate", "fake", "other"] as const;
/** Moderation actions per target type; mirrors the CASE in public.moderate(). */
export const MODERATION_ACTIONS = {
  user: ["suspend", "reinstate"],
  service: ["suspend", "restore"],
  portfolio: ["suspend", "restore"],
  project: ["suspend", "restore"],
  review: ["hide", "restore"],
  message: ["hide", "restore"],
} as const;

export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: trimmed.min(1, msg("validation.required")).max(4000, msg("validation.tooLong")),
});

export const reviewSchema = z
  .object({
    requestId: z.uuid().optional(),
    proposalId: z.uuid().optional(),
    rating: z.coerce.number().int().min(1, msg("validation.rating")).max(5, msg("validation.rating")),
    body: z.union([z.literal(""), trimmed.min(10, msg("validation.tooShort")).max(2000, msg("validation.tooLong"))]),
  })
  .refine((v) => Boolean(v.requestId) !== Boolean(v.proposalId), { ...msg("validation.required"), path: ["rating"] });

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS, { error: () => "validation.pickReason" }),
  details: optionalText(1000),
});
