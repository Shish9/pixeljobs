import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { myProjects } from "@/lib/market";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { ProjectLine, StatusBadge, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function DashProjectsPage({ params }: PageProps<"/[lang]/dashboard/projects">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/projects`);
  const [dict, fmt, projects] = await Promise.all([getDictionary(lang), getFormatters(lang), myProjects(viewer.user.id)]);
  const m = dict.market;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/projects" title={m.navProjects} requires="client"
      action={<ButtonLink href={`/${lang}/dashboard/projects/new`} variant="dark">{m.newProject}</ButtonLink>}>
      {projects.length === 0 ? (
        <EmptyState title={m.dashProjectsEmpty} action={<ButtonLink href={`/${lang}/dashboard/projects/new`}>{m.newProject}</ButtonLink>} />
      ) : (
        <ul className="border-t border-ink">
          {projects.map((p) => (
            <ProjectLine key={p.id} project={p} locale={lang} dict={dict} fmt={fmt} href={`/${lang}/dashboard/projects/${p.id}`}
              extra={
                <p className="mt-2 flex flex-wrap items-center gap-2 md:justify-end">
                  <StatusBadge tone={statusTone(p.status)}>{translate(dict, `market.pstatus_${p.status}`)}</StatusBadge>
                  <span className="text-sm text-ink-subtle">{interpolate(m.proposalsCount, { count: fmt.number(p.proposalCount) })}</span>
                </p>
              } />
          ))}
        </ul>
      )}
    </DashShell>
  );
}
