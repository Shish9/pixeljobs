"use client";

import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { interpolate } from "@/i18n/translate";
import { useDisclosure } from "@/components/layout/useDisclosure";
import { ANYWHERE, CITY_GROUPS } from "@/lib/cities";


type Labels = {
  findCity: string;
  groupKurdistan: string;
  groupIraq: string;
  anywhere: string;
  noCity: string;
  chooseCity: string;
};

/**
 * City picker in the "I need … in [city]" sentence.
 * Button + popover listbox with a filter field (combobox pattern): arrows move, Enter picks, Escape closes.
 * Submits its value through a hidden input named `name`.
 */
export function CityPicker({
  name,
  value: initial,
  cities,
  labels,
  labelledBy,
}: {
  name: string;
  value: string;
  cities: Record<string, string>;
  labels: Labels;
  labelledBy: string;
}) {
  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { open, setOpen, rootRef, buttonProps, panelId } = useDisclosure();
  const filterRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const match = (key: string) => !q || (cities[key] ?? key).toLocaleLowerCase().includes(q) || key.includes(q);
    return [
      { id: "kurdistan", label: labels.groupKurdistan, keys: CITY_GROUPS.kurdistan.filter(match) },
      { id: "iraq", label: labels.groupIraq, keys: CITY_GROUPS.iraq.filter(match) },
    ].filter((g) => g.keys.length > 0);
  }, [query, cities, labels]);

  // Flat option order for keyboard navigation: cities, then "anywhere".
  const options = useMemo(() => [...groups.flatMap((g) => g.keys as readonly string[]), ANYWHERE], [groups]);
  const optionId = (key: string) => `${uid}-opt-${key}`;
  const display = value === ANYWHERE ? labels.anywhere : cities[value] ?? value;

  function openPanel() {
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, options.indexOf(value)));
    requestAnimationFrame(() => filterRef.current?.focus());
  }

  function choose(key: string) {
    setValue(key);
    setOpen(false);
    setQuery("");
    buttonProps.ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const key = options[active];
      if (key) choose(key);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const activeKey = options[active];
  const optionClass = (key: string) =>
    `flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-start text-base ${
      key === value ? "bg-brand-50 font-bold" : ""
    } ${key === activeKey ? "outline outline-2 -outline-offset-2 outline-ink" : ""}`;

  return (
    <div ref={rootRef} className="relative inline-block">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        {...buttonProps}
        aria-haspopup="listbox"
        aria-labelledby={`${labelledBy} ${uid}-value`}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="flex h-14 items-center gap-2 border-b-[3px] border-accent-500 px-1 font-bold text-ink"
      >
        <span id={`${uid}-value`}>{display}</span>
        <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-ink bg-surface text-base font-medium shadow-raised"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-2">
            <Search className="size-4 text-ink-subtle" aria-hidden="true" />
            <label htmlFor={`${uid}-filter`} className="sr-only">
              {labels.findCity}
            </label>
            <input
              id={`${uid}-filter`}
              ref={filterRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={activeKey ? optionId(activeKey) : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              placeholder={labels.findCity}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>

          <div id={`${uid}-list`} role="listbox" aria-label={labels.chooseCity} className="max-h-80 overflow-y-auto py-1">
            {groups.map((g) => (
              <div key={g.id} role="group" aria-labelledby={`${uid}-${g.id}`}>
                <p id={`${uid}-${g.id}`} className="px-4 pt-3 pb-1 text-xs font-bold tracking-wider text-ink-subtle uppercase">
                  {g.label}
                </p>
                {g.keys.map((key) => (
                  <div
                    key={key}
                    id={optionId(key)}
                    role="option"
                    aria-selected={key === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(key)}
                    onMouseEnter={() => setActive(options.indexOf(key))}
                    className={optionClass(key)}
                  >
                    <span>{cities[key] ?? key}</span>
                    {key === value && <Check className="size-4 text-brand-600" strokeWidth={2.5} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="px-4 py-3 text-sm text-ink-subtle">{interpolate(labels.noCity, { query })}</p>
            )}
            <div className="mt-1 border-t border-line pt-1">
              <div
                id={optionId(ANYWHERE)}
                role="option"
                aria-selected={value === ANYWHERE}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(ANYWHERE)}
                onMouseEnter={() => setActive(options.indexOf(ANYWHERE))}
                className={optionClass(ANYWHERE)}
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="size-4" aria-hidden="true" />
                  {labels.anywhere}
                </span>
                {value === ANYWHERE && <Check className="size-4 text-brand-600" strokeWidth={2.5} aria-hidden="true" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
