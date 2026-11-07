import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { updateProposalStatusAction } from "@/lib/actions/market";
import { myProposals } from "@/lib/market";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { StatusAction, StatusBadge, money, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function MyProposalsPage({ params }: PageProps<"/[lang]/dashboard/proposals">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/proposals`);
  const [dict, fmt, rows] = await Promise.all([getDictionary(lang), getFormatters(lang), myProposals(viewer.user.id)]);
  const m = dict.market;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/proposals" title={m.navProposals} requires="freelancer"
      action={<ButtonLink href={`/${lang}/projects`} variant="secondary">{m.browseProjects}</ButtonLink>}>
      {rows.length === 0 ? (
        <EmptyState title={m.dashProposalsEmpty} action={<ButtonLink href={`/${lang}/projects`}>{m.browseProjects}</ButtonLink>} />
      ) : (
        <ul className="border-t border-ink">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-4">
              <div className="min-w-0 flex-1">
                {r.project ? (
                  <Link href={`/${lang}/projects/${r.project_id}`} className="text-lg font-bold hover:text-brand-600" dir="auto">{r.project.title}</Link>
                ) : <span className="text-lg font-bold">—</span>}
                <p className="text-sm text-ink-subtle">
                  {interpolate(m.bidLine, { price: money(fmt, r.bid_minor, r.currency), days: fmt.number(r.timeline_days) })} · {fmt.date(r.created_at)}
                </p>
              </div>
              <StatusBadge tone={statusTone(r.status)}>{translate(dict, `market.prstatus_${r.status}`)}</StatusBadge>
              {(r.status === "submitted" || r.status === "shortlisted") && (
                <StatusAction action={updateProposalStatusAction} locale={lang} id={r.id} status="withdrawn" label={m.pact_withdrawn} tone="danger" />
              )}
            </li>
          ))}
        </ul>
      )}
    </DashShell>
  );
}
