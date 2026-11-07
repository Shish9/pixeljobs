"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { localeMeta, locales, localizePath, type Locale } from "@/i18n/config";
import { useDisclosure } from "./useDisclosure";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const { open, setOpen, rootRef, buttonProps, panelId } = useDisclosure();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        {...buttonProps}
        className="flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm font-semibold text-ink-muted hover:border-line-strong hover:text-ink"
      >
        <Globe className="size-4" aria-hidden="true" />
        <span className="sr-only">{label}: </span>
        <span>{localeMeta[locale].label}</span>
      </button>
      {open && (
        <ul
          id={panelId}
          className="absolute end-0 top-full z-50 mt-1.5 min-w-48 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-raised"
        >
          {locales.map((l) => (
            <li key={l}>
              <Link
                href={localizePath(pathname, l)}
                lang={localeMeta[l].htmlLang}
                hrefLang={localeMeta[l].htmlLang}
                dir={localeMeta[l].dir}
                aria-current={l === locale ? "true" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm text-ink hover:bg-sunken aria-[current=true]:font-semibold aria-[current=true]:text-brand-700"
              >
                <span>{localeMeta[l].label}</span>
                {l === locale && <Check className="size-4" aria-hidden="true" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
