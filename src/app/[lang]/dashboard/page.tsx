import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { dashboardCounts } from "@/lib/market";
import { unreadCount } from "@/lib/trust";
import { ButtonLink } from "@/components/ui/Button";
import { DashboardNav } from "@/components/market/parts";
import { Alert } from "@/components/ui/Alert";
import { Container, ProgressBar } from "@/components/ui/Card";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).dashboard.title, robots: { index: false } };
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard`);
  const [dict, fmt, counts, unread] = await Promise.all([getDictionary(lang), getFormatters(lang), dashboardCounts(viewer.user.id), unreadCount()]);
  const m = dict.market;
  const d = dict.dashboard;
  const sp = await searchParams;
  const p = viewer.profile;

  // Role-aware view: ?mode= picks freelancer/client; default to whichever mode the user has.
  const requested = sp.mode === "client" || sp.mode === "freelancer" ? sp.mode : undefined;
  const mode: "freelancer" | "client" =
    requested === "client" && p.is_client ? "client"
    : requested === "freelancer" && p.is_freelancer ? "freelancer"
    : p.is_freelancer ? "freelancer" : "client";

  const settings = `/${lang}/settings#profile`;
  const steps = [
    { label: d.stepEmail, done: viewer.emailConfirmed, href: null },
    { label: d.stepPhoto, done: Boolean(p.avatar_path), href: settings },
    { label: d.stepUsername, done: Boolean(p.username), href: settings },
    { label: d.stepHeadline, done: Boolean(p.headline?.trim()), href: settings },
    { label: d.stepBio, done: (p.bio?.trim().length ?? 0) >= 40, href: settings },
    { label: d.stepCity, done: Boolean(p.city), href: settings },
  ];
  const done = steps.filter((s) => s.done).length;
  const base = `/${lang}/dashboard`;
  const stats =
    mode === "freelancer"
      ? [
          { label: m.statServices, value: counts.services, href: `${base}/services` },
          { label: m.statRequests, value: counts.requests, href: `${base}/requests` },
          { label: m.statProposals, value: counts.proposals, href: `${base}/proposals` },
        ]
      : [
          { label: m.statProjects, value: counts.projects, href: `${base}/projects` },
          { label: m.statRequests, value: counts.requests, href: `${base}/requests?side=sent` },
        ];
  const actions =
    mode === "freelancer"
      ? [{ href: `${base}/services/new`, label: m.newService }, { href: `/${lang}/projects`, label: m.browseProjects }]
      : [{ href: `${base}/projects/new`, label: m.newProject }, { href: `/${lang}/services`, label: m.browseServices }];

  const tabCls = (active: boolean) =>
    `inline-flex min-h-11 items-center border-b-[3px] px-1 text-base ${active ? "border-brand-600 font-bold text-ink" : "border-transparent text-ink-subtle hover:text-ink"}`;

  return (
    <Container className="py-8 sm:py-12">
      <DashboardNav locale={lang} dict={dict} current="" isFreelancer={p.is_freelancer} isClient={p.is_client} unread={unread} />
      <div className="mt-8 flex flex-col gap-4 border-b border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-h1 font-extrabold tracking-tight rtl:tracking-normal">
          {interpolate(d.welcome, { name: p.display_name || (p.username ? `@${p.username}` : "") }).replace(/[,،]\s*$/, "")}
        </h1>
        {p.is_client && p.is_freelancer && (
          <nav aria-label={dict.settings.rolesLabel} className="flex gap-6">
            <Link href={`/${lang}/dashboard?mode=freelancer`} aria-current={mode === "freelancer" ? "page" : undefined} className={tabCls(mode === "freelancer")}>
              {d.freelancerTab}
            </Link>
            <Link href={`/${lang}/dashboard?mode=client`} aria-current={mode === "client" ? "page" : undefined} className={tabCls(mode === "client")}>
              {d.clientTab}
            </Link>
          </nav>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {sp.password === "updated" && <Alert tone="success">{dict.auth.resetDone}</Alert>}
        {!viewer.emailConfirmed && <Alert tone="warning" title={d.notVerifiedTitle}>{d.notVerifiedBody}</Alert>}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="next-steps">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="next-steps" className="text-xl font-extrabold">{d.nextStepsTitle}</h2>
            <span className="text-sm font-semibold text-brand-600">
              {interpolate(d.stepsDone, { done: fmt.number(done), total: fmt.number(steps.length) })}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={(done / steps.length) * 100} label={d.nextStepsTitle} />
          </div>
          <ul className="mt-4">
            {steps.map((s) => (
              <li key={s.label} className="flex min-h-14 items-center gap-3 border-b border-line">
                {s.done ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full border-2 border-[#bdb4a3]" />
                )}
                <span className={`flex-1 ${s.done ? "text-ink-subtle line-through" : "font-semibold"}`}>
                  {s.label}
                  <span className="sr-only"> — {s.done ? d.stepDone : d.stepTodo}</span>
                </span>
                {!s.done && s.href && (
                  <Link href={s.href} className="text-sm font-bold text-brand-600 underline-offset-4 hover:underline">
                    {d.start}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {(!p.is_freelancer || !p.is_client) && (
            <p className="mt-5 text-sm">
              <Link className="font-semibold text-brand-600 underline-offset-4 hover:underline" href={`/${lang}/settings#preferences`}>
                {p.is_freelancer ? d.enableClient : d.enableFreelancer}
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="work">
          <h2 id="work" className="text-xl font-extrabold">{mode === "freelancer" ? m.workTitle : m.hireTitle}</h2>
          <dl className="mt-4 grid grid-cols-2 border-t border-ink sm:grid-cols-3">
            {stats.map((st) => (
              <div key={st.label} className="border-b border-line py-4 pe-4">
                <dt className="text-sm text-ink-subtle">{st.label}</dt>
                <dd className="mt-1 text-3xl font-extrabold">
                  <Link href={st.href} className="hover:text-brand-600">{fmt.number(st.value)}</Link>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((a, i) => (
              <ButtonLink key={a.href} href={a.href} variant={i === 0 ? "dark" : "secondary"}>{a.label}</ButtonLink>
            ))}
          </div>
        </section>
      </div>
    </Container>
  );
}
