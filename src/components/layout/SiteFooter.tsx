import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/translate";
import { Logo } from "./Logo";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="grid gap-8 border-t border-ink py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-2">
          <Logo href={`/${locale}`} />
          <p className="max-w-sm text-ink-muted">{dict.footer.tagline}</p>
          <p className="text-sm text-ink-subtle">{dict.footer.paymentsNote}</p>
        </div>
        <ul className="space-y-2">
          <li><Link className="hover:underline" href={`/${locale}/services`}>{dict.market.servicesTitle}</Link></li>
          <li><Link className="hover:underline" href={`/${locale}/projects`}>{dict.market.projectsTitle}</Link></li>
          <li><Link className="hover:underline" href={`/${locale}/jobs`}>{dict.nav.jobs}</Link></li>
          <li><Link className="hover:underline" href={`/${locale}/sign-up`}>{dict.nav.join}</Link></li>
        </ul>
        <div className="space-y-2">
          <p className="font-bold">{dict.footer.contact}</p>
          {/* Email intentionally omitted until ownership of pixeljobs.co is confirmed (see docs/known-limitations.md). */}
          <p>
            <a className="hover:underline" href="https://wa.me/9647504508359" rel="noopener noreferrer" target="_blank">WhatsApp</a>
            {" · "}
            <a className="hover:underline" href="https://instagram.com/pixeljobs.co" rel="noopener noreferrer" target="_blank">Instagram</a>
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line py-4 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>{interpolate(dict.footer.rights, { year: new Date().getFullYear() })} · {dict.footer.built}</p>
        <nav aria-label={dict.trust.legalNav}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {(["guidelines", "terms", "privacy", "safety"] as const).map((k) => (
              <li key={k}><Link className="inline-flex min-h-8 items-center hover:text-ink hover:underline" href={`/${locale}/${k}`}>{dict.trust[k]}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
