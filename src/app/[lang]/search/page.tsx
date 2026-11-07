import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import en from "@/i18n/dictionaries/en";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { listJobs } from "@/lib/jobs";
import { listProjects, listServices } from "@/lib/market";
import { ALL_CITY_KEYS as CITY_KEYS, ANYWHERE } from "@/lib/cities";
import { Container } from "@/components/ui/Card";
import { SearchSentence } from "@/components/search/SearchSentence";
import { ProjectLine, ServiceTile } from "@/components/market/parts";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).search.title, robots: { index: false } };
}

/** One search across services, open projects and the legacy job board. Free text goes to Postgres full-text search as a parameter. */
export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const city = typeof sp.city === "string" && CITY_KEYS.includes(sp.city) ? sp.city : ANYWHERE;
  const cityFilter = city === ANYWHERE ? undefined : city;

  const [dict, fmt, services, projects, jobs] = await Promise.all([
    getDictionary(lang),
    getFormatters(lang),
    listServices({ q: q || undefined, city: cityFilter }, 12),
    listProjects({ q: q || undefined, city: cityFilter }, 12),
    listJobs(),
  ]);
  const s = dict.search;
  const m = dict.market;

  const needle = q.toLocaleLowerCase();
  const cityName = cityFilter ? en.cities[cityFilter as keyof typeof en.cities].toLowerCase() : null;
  const jobMatches = jobs.filter((j) => {
    const haystack = `${j.job_title} ${j.company_name} ${j.role_category} ${j.job_description}`.toLocaleLowerCase();
    return (!needle || haystack.includes(needle)) && (!cityName || (j.location ?? "").toLowerCase().includes(cityName));
  });

  const cityLabel = city === ANYWHERE ? s.anywhere : dict.cities[city as keyof typeof dict.cities];
  const heading = q ? interpolate(s.resultsFor, { q, city: cityLabel }) : interpolate(s.browseCity, { city: cityLabel });
  const more = (path: string) => `/${lang}/${path}?${new URLSearchParams({ ...(q ? { q } : {}), ...(cityFilter ? { city: cityFilter } : {}) })}`;
  const sectionHead = (id: string, title: string, count: number, href?: string) => (
    <h2 id={id} className="flex items-baseline justify-between gap-4 border-b border-ink pb-3 text-xl font-extrabold">
      <span>{title} <span className="text-base font-medium text-ink-subtle">{fmt.number(count)}</span></span>
      {href && <Link href={href} className="text-sm font-semibold underline underline-offset-4">{m.view}</Link>}
    </h2>
  );

  return (
    <Container className="py-10 sm:py-14">
      <SearchSentence locale={lang} dict={dict} q={q} city={city} size="md" />
      <h1 className="mt-10 text-h1 font-extrabold tracking-tight rtl:tracking-normal" aria-live="polite">{heading}</h1>

      <section aria-labelledby="r-services" className="mt-10">
        {sectionHead("r-services", s.servicesTitle, services.length, more("services"))}
        {services.length === 0 ? (
          <p className="py-6 text-ink-muted">{m.noServices}</p>
        ) : (
          <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((x) => <li key={x.id}><ServiceTile service={x} locale={lang} dict={dict} fmt={fmt} /></li>)}
          </ul>
        )}
      </section>

      <section aria-labelledby="r-projects" className="mt-12">
        {sectionHead("r-projects", m.projectsTitle, projects.length, more("projects"))}
        {projects.length === 0 ? (
          <p className="py-6 text-ink-muted">{m.noProjects}</p>
        ) : (
          <ul>{projects.map((p) => <ProjectLine key={p.id} project={p} locale={lang} dict={dict} fmt={fmt} />)}</ul>
        )}
      </section>

      <section aria-labelledby="r-jobs" className="mt-12">
        {sectionHead("r-jobs", s.jobsTitle, jobMatches.length)}
        {jobMatches.length === 0 ? (
          <div className="py-6">
            <p className="text-ink-muted">{s.jobsNone}</p>
            {q && <p className="mt-3"><Link className="font-semibold underline underline-offset-4" href={`/${lang}/search?city=${city}`}>{s.clearWords}</Link></p>}
          </div>
        ) : (
          <ul>
            {jobMatches.map((job) => (
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
