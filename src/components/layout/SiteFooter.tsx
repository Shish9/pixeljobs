import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/translate";
import { Logo } from "./Logo";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo href={`/${locale}`} />
          <p className="max-w-sm text-sm text-ink-muted">{dict.footer.tagline}</p>
          <p className="text-xs text-ink-subtle">{dict.footer.paymentsNote}</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li><Link className="text-ink-muted hover:text-ink" href={`/${locale}#how-it-works`}>{dict.nav.howItWorks}</Link></li>
          <li><Link className="text-ink-muted hover:text-ink" href={`/${locale}/jobs`}>{dict.nav.jobs}</Link></li>
          <li><Link className="text-ink-muted hover:text-ink" href={`/${locale}/sign-up`}>{dict.nav.signUp}</Link></li>
        </ul>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{dict.footer.contact}</p>
          {/* Email intentionally omitted until ownership of pixeljobs.co is confirmed (see docs/known-limitations.md). */}
          <p><a className="text-ink-muted hover:text-ink" href="https://wa.me/9647504508359" rel="noopener noreferrer" target="_blank">WhatsApp</a>
            {" · "}
            <a className="text-ink-muted hover:text-ink" href="https://instagram.com/pixeljobs.co" rel="noopener noreferrer" target="_blank">Instagram</a></p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-subtle sm:px-6">
          {interpolate(dict.footer.rights, { year: new Date().getFullYear() })} · {dict.footer.built}
        </p>
      </div>
    </footer>
  );
}
