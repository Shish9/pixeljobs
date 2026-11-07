import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bookmark, Briefcase, FileText, Image as ImageIcon, Inbox, MessageSquare, Package, Star,
} from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/translate";
import { formatNumber } from "@/i18n/format";
import { requireOnboardedViewer } from "@/lib/auth";
import { profileCompletion } from "@/lib/profile";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Container, ProgressBar } from "@/components/ui/Card";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).dashboard.title, robots: { index: false } };
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard`);
  const dict = await getDictionary(lang);
  const d = dict.dashboard;
  const sp = await searchParams;
  const p = viewer.profile;

  // Role-aware view: ?mode= picks freelancer/client; default to whichever mode the user has.
  const requested = sp.mode === "client" || sp.mode === "freelancer" ? sp.mode : undefined;
  const mode: "freelancer" | "client" =
    requested === "client" && p.is_client ? "client"
    : requested === "freelancer" && p.is_freelancer ? "freelancer"
    : p.is_freelancer ? "freelancer" : "client";

  const completion = profileCompletion(p);
  const sections =
    mode === "freelancer"
      ? [
          { title: d.sectionProposals, Icon: FileText },
          { title: d.sectionServices, Icon: Package },
          { title: d.sectionRequests, Icon: Inbox },
          { title: d.sectionMessages, Icon: MessageSquare },
          { title: d.sectionPortfolio, Icon: ImageIcon },
          { title: d.sectionReviews, Icon: Star },
        ]
      : [
          { title: d.sectionProjects, Icon: Briefcase },
          { title: d.sectionProposals, Icon: FileText },
          { title: d.sectionRequests, Icon: Inbox },
          { title: d.sectionMessages, Icon: MessageSquare },
          { title: d.sectionSaved, Icon: Bookmark },
          { title: d.sectionReviews, Icon: Star },
        ];

  const tabCls = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-white" : "text-ink-muted hover:bg-sunken hover:text-ink"}`;

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {interpolate(d.welcome, { name: p.display_name || `@${p.username}` })}
          </h1>
          <p className="mt-1 text-ink-muted">{d.title}</p>
        </div>
        {p.is_client && p.is_freelancer && (
          <nav aria-label={dict.settings.rolesLabel} className="flex gap-1 rounded-lg border border-line bg-surface p-1">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{d.profileProgress}</h2>
            <Badge tone={completion.percent === 100 ? "success" : "brand"}>
              {interpolate(d.profileProgressBody, { percent: formatNumber(completion.percent, lang) })}
            </Badge>
          </div>
          <div className="mt-4">
            <ProgressBar value={completion.percent} label={d.profileProgress} />
          </div>
          {completion.percent < 100 && (
            <ButtonLink href={`/${lang}/settings#profile`} variant="secondary" size="sm" className="mt-5">
              {d.completeProfile}
            </ButtonLink>
          )}
          {!(p.is_freelancer && p.is_client) && <div className="mt-6 border-t border-line pt-5 text-sm">
            {!p.is_freelancer && <Link className="font-semibold text-brand-700 hover:underline" href={`/${lang}/settings#preferences`}>{d.enableFreelancer}</Link>}
            {!p.is_client && <Link className="font-semibold text-brand-700 hover:underline" href={`/${lang}/settings#preferences`}>{d.enableClient}</Link>}
          </div>}
        </Card>

        <section aria-label={mode === "freelancer" ? d.freelancerTab : d.clientTab}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {sections.map(({ title, Icon }) => (
              <li key={title}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <h3 className="font-semibold">{title}</h3>
                    <Badge className="ms-auto">{dict.common.comingSoon}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">{d.emptyArea} {d.phaseNote}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
