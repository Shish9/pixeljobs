import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { translate } from "@/i18n/translate";
import { ALL_CITY_KEYS } from "@/lib/cities";
import { CATEGORY_KEYS, LANG_KEYS } from "@/lib/taxonomy";

/** GET filter form for browse pages. Works without JavaScript; every control is labelled. */
export function FilterBar({
  dict,
  action,
  values,
  withPrice,
  withLanguage,
}: {
  dict: Dictionary;
  action: string;
  values: { q?: string; category?: string; city?: string; lang?: string; max?: string };
  withPrice?: boolean;
  withLanguage?: boolean;
}) {
  const m = dict.market;
  const control = "h-11 w-full rounded-md border border-[#bdb4a3] bg-surface px-3 text-base hover:border-ink focus:border-ink focus:outline-none";
  const label = "mb-1 block text-xs font-bold tracking-wide text-ink-subtle uppercase rtl:text-sm rtl:tracking-normal";
  return (
    <form action={action} method="get" className="grid gap-3 border-y border-ink py-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
      <div>
        <label htmlFor="f-q" className={label}>{dict.search.title}</label>
        <input id="f-q" name="q" type="search" defaultValue={values.q} maxLength={80} placeholder={dict.search.placeholder} className={control} />
      </div>
      <div>
        <label htmlFor="f-category" className={label}>{m.filterCategory}</label>
        <select id="f-category" name="category" defaultValue={values.category ?? ""} className={control}>
          <option value="">{m.filterAll}</option>
          {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{dict.categories[k]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-city" className={label}>{m.filterCity}</label>
        <select id="f-city" name="city" defaultValue={values.city ?? ""} className={control}>
          <option value="">{m.filterAll}</option>
          {ALL_CITY_KEYS.map((k) => <option key={k} value={k}>{translate(dict, `cities.${k}`)}</option>)}
        </select>
      </div>
      {withLanguage && (
        <div>
          <label htmlFor="f-lang" className={label}>{m.filterLanguage}</label>
          <select id="f-lang" name="lang" defaultValue={values.lang ?? ""} className={control}>
            <option value="">{m.filterAll}</option>
            {LANG_KEYS.map((k) => <option key={k} value={k}>{translate(dict, `market.lang_${k}`)}</option>)}
          </select>
        </div>
      )}
      {withPrice && (
        <div>
          <label htmlFor="f-max" className={label}>{m.filterMaxPrice}</label>
          <input id="f-max" name="max" inputMode="numeric" dir="ltr" defaultValue={values.max} className={control} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" className="h-11 rounded-md bg-ink px-5 font-semibold text-white hover:bg-[#2b2a26]">{m.filterApply}</button>
        <Link href={action} className="text-sm underline underline-offset-4">{m.filterClear}</Link>
      </div>
    </form>
  );
}
