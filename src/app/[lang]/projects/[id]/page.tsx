import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { getViewer } from "@/lib/auth";
import { getProject, myPortfolio, myProposalFor, savedSet } from "@/lib/market";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Card";
import { ProposalForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { Person, SaveButton, StatusBadge, budgetLabel, statusTone } from "@/components/market/parts";
import { conversationLinks, ratingsFor } from "@/lib/trust";
import { RatingInline } from "@/components/trust/Rating";
import { ReportButton } from "@/components/trust/TrustForms";
import { pickTrustMessages } from "@/components/trust/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const data = await getProject(id);
  if (!data) return {};
  return { title: data.project.title, description: data.project.description.slice(0, 160) };
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, fmt, data, viewer] = await Promise.all([getDictionary(lang), getFormatters(lang), getProject(id), getViewer()]);
  if (!data) notFound();
  const { project, client } = data;
  const m = dict.market;
  const isOwner = viewer?.user.id === project.client_id;
  const [mine, portfolio, saved] = viewer && !isOwner
    ? await Promise.all([myProposalFor(viewer.user.id, project.id), myPortfolio(viewer.user.id), savedSet(viewer.user.id)])
    : [null, [], new Set<string>()];

  const [ratings, links] = await Promise.all([ratingsFor([project.client_id]), conversationLinks("proposal", mine ? [mine.id] : [])]);
  const thread = mine ? links.get(mine.id) : undefined;
  const tm = viewer && !isOwner ? pickTrustMessages(dict) : undefined;

  const facts: [string, string][] = [
    [m.fBudgetType, translate(dict, `market.budget_${project.budget_type}`)],
    [m.fTimeline, translate(dict, `market.timeline_${project.timeline}`)],
    [m.fExperience, translate(dict, `market.exp_${project.experience_level}`)],
    ...(project.city ? [[m.fCity, translate(dict, `cities.${project.city}`)] as [string, string]] : []),
  ];

  let panel;
  if (isOwner) {
    panel = (
      <div className="space-y-3">
        <Alert>{m.ownProject}</Alert>
        <ButtonLink href={`/${lang}/dashboard/projects/${project.id}`} variant="secondary" className="w-full">{m.manageProject}</ButtonLink>
      </div>
    );
  } else if (!viewer) {
    panel = <ButtonLink href={`/${lang}/sign-in?next=${encodeURIComponent(`/${lang}/projects/${project.id}`)}`} className="w-full" size="lg">{m.signInToPropose}</ButtonLink>;
  } else if (mine) {
    panel = (
      <Alert tone="success" title={m.proposalSent}>
        <p className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge tone={statusTone(mine.status)}>{translate(dict, `market.prstatus_${mine.status}`)}</StatusBadge>
          <Link href={`/${lang}/dashboard/proposals`}>{m.navProposals}</Link>
          {thread && <Link href={`/${lang}/dashboard/messages/${thread}`}>{dict.trust.message}</Link>}
        </p>
      </Alert>
    );
  } else if (project.status !== "open") {
    panel = <Alert>{m.projectClosed}</Alert>;
  } else if (!viewer.profile.is_freelancer) {
    panel = <Alert>{m.becomeFreelancer}</Alert>;
  } else {
    panel = (
      <>
        <h2 className="mb-4 text-xl font-extrabold">{m.sendProposal}</h2>
        <ProposalForm locale={lang} m={pickMarketMessages(dict)} projectId={project.id} portfolio={portfolio.filter((p) => p.status === "published").map((p) => ({ id: p.id, title: p.title }))} />
      </>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <Link href={`/${lang}/projects`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-subtle hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {m.projectsTitle}
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_420px]">
        <article className="min-w-0" dir="auto">
          <p className="text-sm font-bold tracking-wide text-ink-subtle uppercase rtl:tracking-normal">{translate(dict, `categories.${project.category}`)}</p>
          <h1 className="mt-2 text-h1 font-extrabold tracking-tight rtl:tracking-normal">{project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge tone={statusTone(project.status)}>{translate(dict, `market.pstatus_${project.status}`)}</StatusBadge>
            {project.published_at && <span className="text-sm text-ink-subtle">{interpolate(m.postedOn, { date: fmt.date(project.published_at) })}</span>}
          </div>
          <p className="mt-6 inline-block bg-accent-200 px-2 py-1 text-2xl font-extrabold">{budgetLabel(dict, fmt, project)}</p>
          <dl className="mt-6 grid grid-cols-2 border-t border-ink sm:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k} className="border-b border-line py-3 pe-3">
                <dt className="text-xs font-bold text-ink-subtle uppercase rtl:text-sm">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <section className="mt-8">
            <h2 className="text-xl font-extrabold">{m.aboutProject}</h2>
            <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink-muted">{project.description}</p>
          </section>
          {project.skills.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {project.skills.map((s) => <li key={s} className="bg-sunken px-2.5 py-1 text-sm">{s}</li>)}
            </ul>
          )}
          <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
            <Person person={client} fallback={m.aClient} size="sm" />
            <span className="text-sm text-ink-subtle">{client?.display_name || m.aClient}</span>
            <RatingInline rating={ratings.get(project.client_id)} dict={dict} fmt={fmt} />
            {viewer && !isOwner && (
              <span className="ms-auto"><SaveButton locale={lang} itemType="project" itemId={project.id} saved={saved.has(`project:${project.id}`)} label={m.save} savedLabel={m.unsave} /></span>
            )}
          </div>
          {tm && <div className="mt-4"><ReportButton locale={lang} m={tm} targetType="project" targetId={project.id} /></div>}
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-ink bg-surface p-5">{panel}</div>
          <p className="mt-3 bg-accent-100 p-4 text-sm leading-relaxed text-accent-800">{dict.home.beforeBody}</p>
        </aside>
      </div>
    </Container>
  );
}
