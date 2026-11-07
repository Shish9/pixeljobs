import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AccountMessages } from "./AccountForms";

/** Only ship the dictionary sections client forms actually need. */
export function pickAccountMessages(d: Dictionary): AccountMessages {
  return {
    onboarding: d.onboarding,
    settings: d.settings,
    errors: d.errors,
    validation: d.validation,
    common: d.common,
    cities: d.cities,
    nav: d.nav,
    auth: d.auth,
  };
}
