import { describe, expect, it } from "vitest";
import { isLocale, localeMeta, localizePath, matchLocale, locales } from "@/i18n/config";
import { formatDate, formatMoney, formatNumber } from "@/i18n/format";
import { interpolate, translate } from "@/i18n/translate";
import en from "@/i18n/dictionaries/en";
import ar from "@/i18n/dictionaries/ar";
import ckb from "@/i18n/dictionaries/ckb";
import kmr from "@/i18n/dictionaries/kmr";

function leaves(obj: object, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") acc[key] = v;
    else Object.assign(acc, leaves(v as object, key));
    return acc;
  }, {});
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locale config", () => {
  it("knows its locales and directions", () => {
    expect(locales).toEqual(["en", "ar", "ckb", "kmr"]);
    expect(localeMeta.en.dir).toBe("ltr");
    expect(localeMeta.ar.dir).toBe("rtl");
    expect(localeMeta.ckb.dir).toBe("rtl");
    expect(localeMeta.kmr.dir).toBe("rtl");
    expect(isLocale("ckb")).toBe(true);
    expect(isLocale("ku")).toBe(false);
  });

  it("matches Accept-Language headers", () => {
    expect(matchLocale(null)).toBe("en");
    expect(matchLocale("ar-IQ,ar;q=0.9,en;q=0.5")).toBe("ar");
    expect(matchLocale("ckb-IQ")).toBe("ckb");
    expect(matchLocale("ku;q=0.9,en;q=0.8")).toBe("kmr");
    expect(matchLocale("en;q=0.2,ar;q=0.8")).toBe("ar");
    expect(matchLocale("fr-FR,de")).toBe("en");
  });

  it("swaps or adds the locale prefix", () => {
    expect(localizePath("/en/jobs/abc", "ar")).toBe("/ar/jobs/abc");
    expect(localizePath("/en", "ckb")).toBe("/ckb");
    expect(localizePath("/jobs", "kmr")).toBe("/kmr/jobs");
    expect(localizePath("/", "ar")).toBe("/ar");
  });
});

describe("dictionaries", () => {
  const base = leaves(en);
  for (const [name, dict] of Object.entries({ ar, ckb, kmr })) {
    it(`${name} has every English key with the same placeholders and no empty strings`, () => {
      const other = leaves(dict);
      expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
      for (const [key, value] of Object.entries(base)) {
        expect(other[key], key).toBeTruthy();
        expect(placeholders(other[key]!), key).toEqual(placeholders(value));
      }
    });
  }

  it("translates dotted keys and interpolates", () => {
    expect(translate(en, "dashboard.welcome", { name: "Aram" })).toBe("Welcome, Aram");
    expect(translate(en, "missing.key")).toBe("missing.key");
    expect(interpolate("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});

describe("formatting", () => {
  it("formats IQD with no fraction digits", () => {
    expect(formatMoney(1250000, "IQD", "en")).toMatch(/IQD\s?1,250,000/);
    expect(formatMoney(1250000, "IQD", "ar")).toContain("١٬٢٥٠٬٠٠٠");
    expect(formatMoney(1250000, "IQD", "ckb")).toContain("١٬٢٥٠٬٠٠٠");
  });
  it("formats USD from cents", () => {
    expect(formatMoney(129950, "USD", "en")).toContain("1,299.5");
  });
  it("formats numbers and dates per locale (Baghdad time zone)", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
    expect(formatNumber(1234, "ar")).toBe("١٬٢٣٤");
    expect(formatDate("2026-11-06T22:30:00Z", "en", { dateStyle: "long" })).toBe("November 7, 2026");
  });
});
