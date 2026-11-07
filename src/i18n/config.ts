/**
 * Locale registry. Adding a language = add an entry here + a dictionary file.
 *
 * - `ckb` is Central Kurdish (Sorani), Arabic script.
 * - `kmr` is Northern Kurdish (Kurmanji / Badini as spoken in Duhok), written here in Arabic script.
 *   ICU has no Arabic-script Kurmanji data, so number/date formatting borrows `ckb-IQ`.
 */
export const locales = ["en", "ar", "ckb", "kmr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeMeta: Record<
  Locale,
  { label: string; englishName: string; dir: "ltr" | "rtl"; intl: string; htmlLang: string }
> = {
  en: { label: "English", englishName: "English", dir: "ltr", intl: "en-IQ", htmlLang: "en" },
  ar: { label: "العربية", englishName: "Arabic", dir: "rtl", intl: "ar-IQ", htmlLang: "ar-IQ" },
  ckb: { label: "کوردی (سۆرانی)", englishName: "Kurdish (Sorani)", dir: "rtl", intl: "ckb-IQ", htmlLang: "ckb" },
  kmr: { label: "کوردی (بادینی)", englishName: "Kurdish (Badini)", dir: "rtl", intl: "ckb-IQ", htmlLang: "kmr-Arab" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const LOCALE_COOKIE = "pj_locale";

/** Pick the best supported locale from an Accept-Language header. */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of prefs) {
    const base = tag.split("-")[0];
    if (tag.startsWith("ckb") || tag === "ku-iq" || tag === "ku-arab") return "ckb";
    if (base === "kmr" || base === "ku") return "kmr";
    if (base === "ar") return "ar";
    if (base === "en") return "en";
  }
  return defaultLocale;
}

/** Replace or add the locale prefix of a pathname. */
export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
