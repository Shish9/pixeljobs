import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { getLegal } from "@/content/legal";
import { LEGAL_KEYS, LEGAL_UPDATED, type LegalKey } from "@/content/legal/types";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/Alert";
import { Container } from "@/components/ui/Card";

export async function legalMetadata(lang: string, key: LegalKey): Promise<Metadata> {
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.trust[key] };
}

/** Shared layout for the policy pages. Every page carries the "draft, not yet reviewed by a lawyer" banner. */
export async function LegalPage({ lang, page }: { lang: string; page: LegalKey }) {
  if (!isLocale(lang)) notFound();
  const [dict, fmt, legal] = await Promise.all([getDictionary(lang), getFormatters(lang), getLegal(lang)]);
  const tr = dict.trust;
  const doc = legal[page];
  return (
    <Container className="py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label={tr.legalNav} className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-bold text-ink-subtle">{tr.legalNav}</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 lg:block">
            {LEGAL_KEYS.map((k) => (
              <li key={k}>
                <Link href={`/${lang}/${k}`} aria-current={k === page ? "page" : undefined}
                  className={cn("inline-flex min-h-11 items-center", k === page ? "font-bold text-ink" : "text-ink-muted hover:text-ink")}>
                  {tr[k]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-h1 font-extrabold tracking-tight rtl:tracking-normal">{tr[page]}</h1>
          <p className="mt-2 text-sm text-ink-subtle">{interpolate(tr.legalUpdated, { date: fmt.date(LEGAL_UPDATED) })}</p>
          <Alert className="mt-6">{tr.legalDraft}</Alert>
          <p className="mt-8 text-lg leading-relaxed text-ink-muted">{doc.intro}</p>
          {doc.sections.map((s, i) => (
            <section key={s.h} aria-labelledby={`s${i}`} className="mt-10">
              <h2 id={`s${i}`} className="border-b border-ink pb-2 text-xl font-extrabold">{s.h}</h2>
              {s.p.map((para) => <p key={para} className="mt-4 leading-relaxed">{para}</p>)}
            </section>
          ))}
        </article>
      </div>
    </Container>
  );
}
