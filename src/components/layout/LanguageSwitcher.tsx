"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { localeMeta, locales, localizePath, type Locale } from "@/i18n/config";
import { useDisclosure } from "./useDisclosure";

/** Language menu: each language is listed in its own script and direction (standard for language pickers). */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const { open, setOpen, rootRef, buttonProps, panelId } = useDisclosure();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        {...buttonProps}
        className="flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-ink px-2.5 text-sm whitespace-nowrap text-ink hover:bg-sunken sm:px-3"
      >
        <Globe className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{label}: </span>
        {/* Phones show only the globe; the language name stays available to screen readers. */}
        <span className="sr-only sm:not-sr-only">{localeMeta[locale].label}</span>
        <ChevronDown className={`hidden size-3.5 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={panelId}
          aria-label={label}
          className="absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-md border border-ink bg-surface py-1.5 shadow-raised"
        >
          {locales.map((l) => {
            const current = l === locale;
            return (
              <li key={l}>
                <Link
                  href={localizePath(pathname, l)}
                  lang={localeMeta[l].htmlLang}
                  hrefLang={localeMeta[l].htmlLang}
                  dir={localeMeta[l].dir}
                  aria-current={current ? "true" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center justify-between gap-3 px-4 text-base hover:bg-sunken ${
                    current ? "bg-brand-50 font-bold text-ink" : "text-ink"
                  }`}
                >
                  <span>{localeMeta[l].label}</span>
                  {current && <Check className="size-4 text-brand-600" strokeWidth={2.5} aria-hidden="true" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
