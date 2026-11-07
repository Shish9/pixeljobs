import type { Dictionary } from "@/i18n/dictionaries/en";
import type { MarketMessages } from "./MarketForms";

/** Only ship the dictionary sections the marketplace forms use. */
export function pickMarketMessages(d: Dictionary): MarketMessages {
  return {
    market: d.market,
    errors: d.errors,
    validation: d.validation,
    common: d.common,
    categories: d.categories,
    cities: d.cities,
    onboarding: d.onboarding,
  };
}
