import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Card";
import { SearchSentence } from "@/components/search/SearchSentence";
import { ALL_CITY_KEYS } from "@/lib/cities";

const CATEGORY_KEYS = ["design", "development", "writing", "translation", "marketing", "video", "business", "engineering"] as const;

export default async function HomePage({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const h = dict.home;
  const sp = await searchParams;
  const cityKeys = ALL_CITY_KEYS as readonly (keyof typeof dict.cities)[];
  const tries = [h.try1, h.try2, h.try3, h.try4];
  const searchHref = (params: Record<string, string>) => `/${lang}/search?${new URLSearchParams(params).toString()}`;

  return (
    <>
      {sp.signed_out === "1" && (
        <Container className="pt-6"><Alert tone="success">{dict.auth.signedOut}</Alert></Container>
      )}

      {/* Hero: one language per screen, set large */}
      <Container className="pt-12 sm:pt-16">
        <h1 className="text-[clamp(3.25rem,11vw,8.25rem)] leading-[0.98] font-extrabold tracking-[-0.04em] rtl:leading-[1.3] rtl:font-bold rtl:tracking-normal">
          {h.heroLead} <span className="whitespace-nowrap text-brand-600">{h.heroAccent}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-xl text-ink-subtle sm:text-2xl">{h.heroSub}</p>

        <div className="mt-10">
          <SearchSentence locale={lang} dict={dict} />
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem]">
            <span className="text-ink-subtle">{h.tryLabel}</span>
            {tries.map((t) => (
              <Link key={t} href={searchHref({ q: t })} className="underline decoration-accent-500 decoration-2 underline-offset-[6px] hover:text-brand-600">
                {t}
              </Link>
            ))}
          </p>
        </div>
      </Container>

      {/* Two ways to work */}
      <Container className="mt-20">
        <h2 className="border-b border-ink pb-3 text-h2 font-extrabold">{h.pathsTitle}</h2>
        <div className="grid md:grid-cols-2">
          {[
            { title: h.servicesTitle, body: h.servicesBody },
            { title: h.projectsTitle, body: h.projectsBody },
          ].map((p, i) => (
            <div key={p.title} className={`py-6 ${i === 0 ? "md:border-e md:border-line md:pe-8" : "border-t border-line md:border-t-0 md:ps-8"}`}>
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* What you can hire for: a ruled list, no fake listings */}
      <Container className="mt-16">
        <h2 className="border-b border-ink pb-3 text-sm font-bold tracking-wider uppercase rtl:text-base rtl:tracking-normal">{h.categoriesTitle}</h2>
        <ul className="grid sm:grid-cols-2">
          {CATEGORY_KEYS.map((key) => (
            <li key={key} className="border-b border-line sm:odd:pe-8 sm:even:ps-8">
              <Link href={searchHref({ q: dict.categories[key] })} className="group flex min-h-14 items-center justify-between gap-4 py-3 text-lg font-semibold">
                <span className="group-hover:text-brand-600">{dict.categories[key]}</span>
                <span aria-hidden="true" className="text-ink-subtle transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Cities as running type */}
      <Container className="mt-16">
        <h2 className="text-sm font-bold tracking-wider uppercase rtl:text-base rtl:tracking-normal">{h.citiesTitle}</h2>
        <p className="mt-4 text-[clamp(1.75rem,4.5vw,2.75rem)] leading-snug font-extrabold tracking-tight rtl:font-bold rtl:tracking-normal">
          {cityKeys.map((key, i) => (
            <span key={key}>
              <Link href={searchHref({ city: key })} className="underline-offset-8 hover:text-brand-600 hover:underline">
                {dict.cities[key]}
              </Link>
              {i < cityKeys.length - 1 && <span aria-hidden="true" className="mx-2 text-accent-500"> / </span>}
            </span>
          ))}
        </p>
      </Container>

      {/* Before you hire: honest footnote */}
      <Container className="mt-20">
        <div className="grid gap-4 border-t border-ink pt-8 md:grid-cols-[1fr_2fr] md:gap-8">
          <h2 className="text-xl font-extrabold">{h.beforeTitle}</h2>
          <p className="text-lg leading-relaxed text-ink-muted">{h.beforeBody}</p>
        </div>
      </Container>

      {/* Join */}
      <Container className="mt-20">
        <div className="flex flex-col gap-6 border-y border-ink py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h2 font-extrabold">{h.finalTitle}</h2>
            <p className="mt-2 text-lg text-ink-muted">{h.finalBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <ButtonLink href={`/${lang}/sign-up`} variant="dark" size="lg">{dict.nav.join}</ButtonLink>
            <Link href={`/${lang}/jobs`} className="text-[0.95rem] underline underline-offset-4 hover:text-brand-600">{h.jobsLink}</Link>
          </div>
        </div>
      </Container>
    </>
  );
}
