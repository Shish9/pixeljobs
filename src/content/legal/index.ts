import type { Locale } from "@/i18n/config";
import type { LegalSet } from "./types";

const loaders: Record<Locale, () => Promise<{ default: LegalSet }>> = {
  en: () => import("./en"),
  ar: () => import("./ar"),
  ckb: () => import("./ckb"),
  kmr: () => import("./kmr"),
};

export async function getLegal(locale: Locale): Promise<LegalSet> {
  return (await loaders[locale]()).default;
}
