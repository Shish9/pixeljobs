import { localeMeta, type Locale } from "./config";
import { getCurrency, type CurrencyCode } from "@/lib/currency";

/** "native" = the locale's own digits (Arabic-Indic ١٢٣ for ar/ckb/kmr); "latin" = Western 123. */
export type DigitStyle = "native" | "latin";
export const DIGIT_COOKIE = "pj_digits";
export const isDigitStyle = (v: unknown): v is DigitStyle => v === "native" || v === "latin";

function intlOptions<T extends Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>(opts: T, digits?: DigitStyle): T {
  return digits === "latin" ? { ...opts, numberingSystem: "latn" } : opts;
}

/**
 * Format an amount stored in minor units (see currencies.minor_units) for display.
 * IQD is configured with 0 minor units, so 1250000 → "IQD 1,250,000" / "١٬٢٥٠٬٠٠٠ د.ع.‏".
 */
export function formatMoney(amountMinor: number | bigint, currency: CurrencyCode, locale: Locale, digits?: DigitStyle): string {
  const { minorUnits } = getCurrency(currency);
  const major = Number(amountMinor) / 10 ** minorUnits;
  return new Intl.NumberFormat(
    localeMeta[locale].intl,
    intlOptions({ style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: minorUnits }, digits),
  ).format(major);
}

export function formatNumber(value: number, locale: Locale, options: Intl.NumberFormatOptions = {}, digits?: DigitStyle): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, intlOptions(options, digits)).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  digits?: DigitStyle,
): string {
  return new Intl.DateTimeFormat(localeMeta[locale].intl, intlOptions({ timeZone: "Asia/Baghdad", ...options }, digits)).format(
    new Date(value),
  );
}

export function formatRelativeDays(value: string | number | Date, locale: Locale, now = Date.now(), digits?: DigitStyle): string {
  const days = Math.round((new Date(value).getTime() - now) / 86_400_000);
  return new Intl.RelativeTimeFormat(localeMeta[locale].intl, intlOptions({ numeric: "auto" } as Intl.RelativeTimeFormatOptions, digits)).format(days, "day");
}
