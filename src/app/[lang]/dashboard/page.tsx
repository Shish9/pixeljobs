import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
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
  const [dict, fmt] = await Promise.all([getDictionary(lang), getFormatters(lang)]);
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
  const upcoming =
    mode === "freelancer"
      ? [d.sectionServices, d.sectionProposals, d.sectionRequests, d.sectionMessages, d.sectionPortfolio, d.sectionReviews]
      : [d.sectionProjects, d.sectionProposals, d.sectionRequests, d.sectionMessages, d.sectionSaved, d.sectionReviews];

  const tabCls = (active: boolean) =>
    `inline-flex min-h-11 items-center border-b-[3px] px-1 text-base ${active ? "border-brand-600 font-bold text-ink" : "border-transparent text-ink-subtle hover:text-ink"}`;

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-4 border-b border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
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

        <section aria-labelledby="coming">
          <h2 id="coming" className="text-xl font-extrabold">{d.comingTitle}</h2>
          <p className="mt-2 text-ink-muted">{mode === "freelancer" ? d.comingFreelancer : d.comingClient}</p>
          <ul className="mt-4 border-t border-ink">
            {upcoming.map((label) => (
              <li key={label} className="flex min-h-12 items-center justify-between border-b border-line text-ink-muted">
                <span>{label}</span>
                <span className="text-xs font-semibold text-ink-subtle">{dict.common.comingSoon}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
