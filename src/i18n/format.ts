import { localeMeta, type Locale } from "./config";
import { getCurrency, type CurrencyCode } from "@/lib/currency";

/**
 * Format an amount stored in minor units (see currencies.minor_units) for display.
 * IQD is configured with 0 minor units, so 1250000 → "IQD 1,250,000" / "١٬٢٥٠٬٠٠٠ د.ع.‏".
 */
export function formatMoney(amountMinor: number | bigint, currency: CurrencyCode, locale: Locale): string {
  const { minorUnits } = getCurrency(currency);
  const major = Number(amountMinor) / 10 ** minorUnits;
  return new Intl.NumberFormat(localeMeta[locale].intl, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: minorUnits,
  }).format(major);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, options).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(localeMeta[locale].intl, { timeZone: "Asia/Baghdad", ...options }).format(
    new Date(value),
  );
}

export function formatRelativeDays(value: string | number | Date, locale: Locale, now = Date.now()): string {
  const days = Math.round((new Date(value).getTime() - now) / 86_400_000);
  return new Intl.RelativeTimeFormat(localeMeta[locale].intl, { numeric: "auto" }).format(days, "day");
}
