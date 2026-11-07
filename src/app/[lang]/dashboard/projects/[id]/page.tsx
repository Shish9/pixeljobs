import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { deleteProjectAction, setProjectStatusAction, updateProposalStatusAction } from "@/lib/actions/market";
import { getProject, proposalsForProject } from "@/lib/market";
import { CLIENT_PROPOSAL_ACTIONS, PROJECT_TRANSITIONS, type ProjectStatus } from "@/lib/taxonomy";
import { safeExternalUrl } from "@/lib/text";
import { Alert } from "@/components/ui/Alert";
import { ProjectForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";
import { Person, StatusAction, StatusBadge, money, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function ManageProjectPage({ params, searchParams }: PageProps<"/[lang]/dashboard/projects/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/projects/${id}`);
  const [dict, fmt, data, sp] = await Promise.all([getDictionary(lang), getFormatters(lang), getProject(id), searchParams]);
  if (!data || data.project.client_id !== viewer.user.id) notFound();
  const { project } = data;
  const proposals = await proposalsForProject(project.id);
  const m = dict.market;
  const transitions = PROJECT_TRANSITIONS[project.status as ProjectStatus];
  const visible = proposals.filter((p) => p.status !== "withdrawn");

  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/projects" title={m.editProject} requires="client"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone(project.status)}>{translate(dict, `market.pstatus_${project.status}`)}</StatusBadge>
          {project.status !== "draft" && <Link className="text-sm font-semibold underline underline-offset-4" href={`/${lang}/projects/${project.id}`}>{m.view}</Link>}
          {transitions.filter((s) => s !== "open" || project.status !== "draft").map((s) => (
            <StatusAction key={s} action={setProjectStatusAction} locale={lang} id={project.id} status={s}
              label={translate(dict, `market.act_${s}`)} tone={s === "cancelled" ? "danger" : "secondary"} />
          ))}
          {project.status === "draft" && (
            <form action={deleteProjectAction}>
              <input type="hidden" name="locale" value={lang} />
              <input type="hidden" name="id" value={project.id} />
              <button type="submit" className="min-h-10 rounded-md border border-danger-700 px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50">{m.delete}</button>
            </form>
          )}
        </div>
      }>
      {sp.saved === "open" && <Alert tone="success" className="mb-6">{m.publishedOk}</Alert>}
      {sp.saved === "draft" && <Alert tone="success" className="mb-6">{m.draftSaved}</Alert>}

      {project.status !== "draft" && (
        <section aria-labelledby="pipeline" className="mb-12">
          <h2 id="pipeline" className="flex items-baseline justify-between border-b border-ink pb-2 text-xl font-extrabold">
            <span>{m.proposalsFor}</span>
            <span className="text-base font-medium text-ink-subtle">{fmt.number(visible.length)}</span>
          </h2>
          {visible.length === 0 ? (
            <p className="py-6 text-ink-subtle">{m.noProposalsYet}</p>
          ) : (
            <ul>
              {visible.map((p) => (
                <li key={p.id} className="grid gap-4 border-b border-line py-5 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <Person person={p.freelancer} fallback="?" size="sm" />
                      {p.freelancer?.username ? (
                        <Link href={`/${lang}/u/${p.freelancer.username}`} className="font-bold hover:text-brand-600">{p.freelancer.display_name}</Link>
                      ) : (
                        <span className="font-bold">{p.freelancer?.display_name ?? "—"}</span>
                      )}
                      <StatusBadge tone={statusTone(p.status)}>{translate(dict, `market.prstatus_${p.status}`)}</StatusBadge>
                    </div>
                    <p className="mt-2 inline-block bg-accent-200 px-1.5 font-extrabold">
                      {interpolate(m.bidLine, { price: money(fmt, p.bid_minor, p.currency), days: fmt.number(p.timeline_days) })}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-ink-muted" dir="auto">{p.cover_letter}</p>
                    {p.answers && <p className="mt-2 whitespace-pre-line text-sm text-ink-subtle" dir="auto">{p.answers}</p>}
                    {p.portfolio.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {p.portfolio.map((w) => {
                          const link = safeExternalUrl(w.link_url);
                          return (
                            <li key={w.id} className="inline-flex items-center gap-1 bg-sunken px-2 py-1 text-sm">
                              {link ? <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline">{w.title}<ExternalLink className="size-3" aria-hidden="true" /></a> : w.title}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:max-w-56 md:justify-end">
                    {CLIENT_PROPOSAL_ACTIONS[p.status].map((a) => (
                      <StatusAction key={a} action={updateProposalStatusAction} locale={lang} id={p.id} status={a}
                        label={translate(dict, `market.pact_${a}`)} tone={a === "accepted" ? "primary" : a === "rejected" ? "danger" : "secondary"} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="edit" className="max-w-3xl">
        <h2 id="edit" className="mb-5 border-b border-ink pb-2 text-xl font-extrabold">{m.detailsTitle}</h2>
        <ProjectForm locale={lang} m={pickMarketMessages(dict)} project={project} />
      </section>
    </DashShell>
  );
}
