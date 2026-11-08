import type { Dictionary } from "@/i18n/dictionaries/en";

/** Dictionary sections the trust forms need (server-safe; the forms themselves are client components). */
export type TrustMessages = Pick<Dictionary, "trust" | "errors" | "validation" | "common">;

export function pickTrustMessages(d: Dictionary): TrustMessages {
  return { trust: d.trust, errors: d.errors, validation: d.validation, common: d.common };
}
