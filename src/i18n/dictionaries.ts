import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  ar: () => import("./dictionaries/ar").then((m) => m.default),
  ckb: () => import("./dictionaries/ckb").then((m) => m.default),
  kmr: () => import("./dictionaries/kmr").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
