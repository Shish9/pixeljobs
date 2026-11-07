/**
 * Currency registry. Mirrors the `public.currencies` table; amounts are always stored
 * as integers in minor units together with an ISO-4217 code.
 * IQD is treated as having 0 minor units (fils are not used in practice).
 */
export const currencies = {
  IQD: { code: "IQD", minorUnits: 0, isDefault: true },
  USD: { code: "USD", minorUnits: 2, isDefault: false },
} as const;

export type CurrencyCode = keyof typeof currencies;
export const defaultCurrency: CurrencyCode = "IQD";

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in currencies;
}

export function getCurrency(code: CurrencyCode) {
  return { ...currencies[code] };
}

/** Convert a user-entered major amount ("1,250,000") into integer minor units. */
export function toMinorUnits(major: number, code: CurrencyCode): number {
  return Math.round(major * 10 ** currencies[code].minorUnits);
}
