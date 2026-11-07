import { ALL_CITY_KEYS } from "@/lib/cities";
import { CATEGORY_KEYS, LANG_KEYS, isOneOf } from "@/lib/taxonomy";
import { normalizeDigits } from "@/lib/validation";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** Whitelists browse filters from the query string; unknown values are dropped. */
export function readFilters(sp: SP) {
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const category = isOneOf(CATEGORY_KEYS, one(sp.category)) ? one(sp.category) : undefined;
  const city = isOneOf(ALL_CITY_KEYS as readonly string[], one(sp.city)) ? one(sp.city) : undefined;
  const lang = isOneOf(LANG_KEYS, one(sp.lang)) ? one(sp.lang) : undefined;
  const maxRaw = normalizeDigits(one(sp.max) ?? "");
  const maxPrice = /^\d{1,12}$/.test(maxRaw) ? Number(maxRaw) : null;
  return { q, category, city, lang, maxPrice, raw: { q, category, city, lang, max: maxPrice ? String(maxPrice) : undefined } };
}
