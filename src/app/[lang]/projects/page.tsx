import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { getViewer } from "@/lib/auth";
import { readFilters } from "@/lib/filters";
import { listProjects } from "@/lib/market";
import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState } from "@/components/ui/Card";
import { FilterBar } from "@/components/market/FilterBar";
import { PageHead, ProjectLine } from "@/components/market/parts";

export async function generateMetadata({ params }: PageProps<"/[lang]/projects">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.market.projectsTitle, description: d.market.projectsIntro, alternates: { canonical: `/${lang}/projects` } };
}

export default async function ProjectsPage({ params, searchParams }: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const f = readFilters(await searchParams);
  const [dict, fmt, projects, viewer] = await Promise.all([
    getDictionary(lang),
    getFormatters(lang),
    listProjects({ q: f.q, category: f.category, city: f.city }),
    getViewer(),
  ]);
  const m = dict.market;
  return (
    <Container className="py-10 sm:py-14">
      <PageHead
        title={m.projectsTitle}
        intro={m.projectsIntro}
        action={viewer?.profile.is_client ? <ButtonLink href={`/${lang}/dashboard/projects/new`} variant="dark">{m.newProject}</ButtonLink> : undefined}
      />
      <div className="mt-8"><FilterBar dict={dict} action={`/${lang}/projects`} values={f.raw} /></div>
      <p className="mt-6 text-sm text-ink-subtle" aria-live="polite">{interpolate(m.resultsCount, { count: fmt.number(projects.length) })}</p>
      {projects.length === 0 ? (
        <div className="mt-4"><EmptyState title={m.noProjects} /></div>
      ) : (
        <ul className="mt-2 border-t border-ink">
          {projects.map((p) => <ProjectLine key={p.id} project={p} locale={lang} dict={dict} fmt={fmt} />)}
        </ul>
      )}
    </Container>
  );
}
