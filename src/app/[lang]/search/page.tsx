import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import en from "@/i18n/dictionaries/en";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { listJobs } from "@/lib/jobs";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Card";
import { SearchSentence } from "@/components/search/SearchSentence";
import { ALL_CITY_KEYS as CITY_KEYS, ANYWHERE } from "@/lib/cities";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).search.title, robots: { index: false } };
}

/**
 * Search. Until freelance services exist (Phase 6) this searches the read-only job board and says so plainly.
 * Filtering happens in memory over at most 200 active jobs — no user input reaches a database filter string.
 */
export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const city = typeof sp.city === "string" && CITY_KEYS.includes(sp.city) ? sp.city : ANYWHERE;

  const [dict, jobs, fmt] = await Promise.all([getDictionary(lang), listJobs(), getFormatters(lang)]);
  const s = dict.search;

  const needle = q.toLocaleLowerCase();
  // Job locations are stored in English, so match the city against its English name.
  const cityName = city === ANYWHERE ? null : en.cities[city as keyof typeof en.cities].toLowerCase();
  const matches = jobs.filter((j) => {
    const haystack = `${j.job_title} ${j.company_name} ${j.role_category} ${j.job_description}`.toLocaleLowerCase();
    if (needle && !haystack.includes(needle)) return false;
    if (cityName && !(j.location ?? "").toLowerCase().includes(cityName)) return false;
    return true;
  });

  const cityLabel = city === ANYWHERE ? s.anywhere : dict.cities[city as keyof typeof dict.cities];
  const heading = q ? interpolate(s.resultsFor, { q, city: cityLabel }) : interpolate(s.browseCity, { city: cityLabel });

  return (
    <Container className="py-10 sm:py-14">
      <SearchSentence locale={lang} dict={dict} q={q} city={city} size="md" />
      <h1 className="mt-10 text-h1 font-extrabold tracking-tight rtl:tracking-normal" aria-live="polite">{heading}</h1>

      <section aria-labelledby="services" className="mt-10">
        <h2 id="services" className="border-b border-ink pb-3 text-xl font-extrabold">{s.servicesTitle}</h2>
        <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-lg text-ink-muted">{s.servicesSoon}</p>
          <ButtonLink href={`/${lang}/sign-up?intent=work`} variant="secondary">{s.offerService}</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="jobs" className="mt-6">
        <h2 id="jobs" className="flex items-baseline justify-between border-b border-ink pb-3 text-xl font-extrabold">
          <span>{s.jobsTitle}</span>
          <span className="text-base font-medium text-ink-subtle">{fmt.number(matches.length)}</span>
        </h2>
        {matches.length === 0 ? (
          <div className="py-8">
            <p className="text-lg text-ink-muted">{s.jobsNone}</p>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link className="font-semibold underline underline-offset-4" href={`/${lang}/search?city=${city}`}>{s.clearWords}</Link>
              <Link className="font-semibold underline underline-offset-4" href={`/${lang}/jobs`}>{dict.jobs.back}</Link>
            </p>
          </div>
        ) : (
          <ul>
            {matches.map((job) => (
              <li key={job.id} className="border-b border-line">
                <Link href={`/${lang}/jobs/${job.slug}`} className="group grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6" dir="auto">
                  <span>
                    <span className="block text-lg font-semibold group-hover:text-brand-600">{job.job_title}</span>
                    <span className="text-ink-subtle">{job.company_name}{job.location ? ` · ${job.location}` : ""}</span>
                  </span>
                  <span className="text-sm text-ink-subtle">{interpolate(dict.jobs.posted, { date: fmt.date(job.published_date) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
