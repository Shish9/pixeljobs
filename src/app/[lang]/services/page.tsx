import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { getViewer } from "@/lib/auth";
import { readFilters } from "@/lib/filters";
import { listServices } from "@/lib/market";
import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState } from "@/components/ui/Card";
import { FilterBar } from "@/components/market/FilterBar";
import { PageHead, ServiceTile } from "@/components/market/parts";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.market.servicesTitle, description: d.market.servicesIntro, alternates: { canonical: `/${lang}/services` } };
}

export default async function ServicesPage({ params, searchParams }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const f = readFilters(await searchParams);
  const [dict, fmt, services, viewer] = await Promise.all([
    getDictionary(lang),
    getFormatters(lang),
    listServices({ q: f.q, category: f.category, city: f.city, lang: f.lang, maxPrice: f.maxPrice }),
    getViewer(),
  ]);
  const m = dict.market;
  return (
    <Container className="py-10 sm:py-14">
      <PageHead
        title={m.servicesTitle}
        intro={m.servicesIntro}
        action={viewer?.profile.is_freelancer ? <ButtonLink href={`/${lang}/dashboard/services/new`} variant="dark">{m.newService}</ButtonLink> : undefined}
      />
      <div className="mt-8">
        <FilterBar dict={dict} action={`/${lang}/services`} values={f.raw} withPrice withLanguage />
      </div>
      <p className="mt-6 text-sm text-ink-subtle" aria-live="polite">{interpolate(m.resultsCount, { count: fmt.number(services.length) })}</p>
      {services.length === 0 ? (
        <div className="mt-4"><EmptyState title={m.noServices} /></div>
      ) : (
        <ul className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => <li key={s.id}><ServiceTile service={s} locale={lang} dict={dict} fmt={fmt} /></li>)}
        </ul>
      )}
    </Container>
  );
}
