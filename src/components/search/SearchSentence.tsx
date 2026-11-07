import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ANYWHERE } from "@/lib/cities";
import { CityPicker } from "./CityPicker";

/** "I need [what] in [city] →" — a GET form to /[lang]/search, readable as a sentence in every language. */
export function SearchSentence({
  locale,
  dict,
  q = "",
  city = ANYWHERE,
  size = "lg",
}: {
  locale: Locale;
  dict: Dictionary;
  q?: string;
  city?: string;
  size?: "lg" | "md";
}) {
  const s = dict.search;
  const text = size === "lg" ? "text-2xl sm:text-[1.75rem]" : "text-xl";
  return (
    <form
      action={`/${locale}/search`}
      method="get"
      role="search"
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-ink py-4 font-semibold ${text}`}
    >
      <label htmlFor="q" className="shrink-0">
        {s.need}
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={80}
        placeholder={s.placeholder}
        className="h-14 min-w-0 flex-[999_1_16rem] border-b-[3px] border-accent-500 bg-transparent px-1 font-medium text-ink outline-none placeholder:text-ink-subtle placeholder:font-normal focus-visible:border-ink"
      />
      <span id="city-label" className="shrink-0">
        {s.in}
      </span>
      <CityPicker
        name="city"
        value={city}
        cities={dict.cities}
        labelledBy="city-label"
        labels={{
          findCity: s.findCity,
          groupKurdistan: s.groupKurdistan,
          groupIraq: s.groupIraq,
          anywhere: s.anywhere,
          noCity: s.noCity,
          chooseCity: s.chooseCity,
        }}
      />
      <button
        type="submit"
        className="ms-auto grid size-14 shrink-0 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700 active:translate-y-px"
      >
        <ArrowRight className="size-6 rtl:-scale-x-100" strokeWidth={2.4} aria-hidden="true" />
        <span className="sr-only">{s.submit}</span>
      </button>
    </form>
  );
}
