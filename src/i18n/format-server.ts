import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "./config";
import { DIGIT_COOKIE, formatDate, formatMoney, formatNumber, isDigitStyle, type DigitStyle } from "./format";
import type { CurrencyCode } from "@/lib/currency";

export async function getDigitStyle(): Promise<DigitStyle> {
  const value = (await cookies()).get(DIGIT_COOKIE)?.value;
  return isDigitStyle(value) ? value : "native";
}

/** Formatters bound to the request's locale and the visitor's digit preference. */
export async function getFormatters(locale: Locale) {
  const digits = await getDigitStyle();
  return {
    digits,
    number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options, digits),
    date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatDate(value, locale, options, digits),
    money: (amountMinor: number | bigint, currency: CurrencyCode) => formatMoney(amountMinor, currency, locale, digits),
  };
}
