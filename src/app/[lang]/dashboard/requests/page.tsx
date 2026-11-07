import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { updateRequestStatusAction } from "@/lib/actions/market";
import { requestsFor } from "@/lib/market";
import { CLIENT_REQUEST_ACTIONS, FREELANCER_REQUEST_ACTIONS } from "@/lib/taxonomy";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { Person, StatusAction, StatusBadge, money, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function RequestsPage({ params, searchParams }: PageProps<"/[lang]/dashboard/requests">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/requests`);
  const sp = await searchParams;
  const side: "received" | "sent" = sp.side === "sent" || !viewer.profile.is_freelancer ? "sent" : "received";
  const [dict, fmt, rows] = await Promise.all([getDictionary(lang), getFormatters(lang), requestsFor(viewer.user.id, side)]);
  const m = dict.market;
  const tab = (key: "received" | "sent", label: string) => (
    <Link href={`/${lang}/dashboard/requests?side=${key}`} aria-current={side === key ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-[3px] px-1 ${side === key ? "border-brand-600 font-bold" : "border-transparent text-ink-subtle"}`}>{label}</Link>
  );
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/requests" title={m.navRequests}>
      {viewer.profile.is_freelancer && viewer.profile.is_client && <nav aria-label={m.navRequests} className="mb-6 flex gap-6">{tab("received", m.received)}{tab("sent", m.sent)}</nav>}
      {rows.length === 0 ? (
        <EmptyState title={m.dashRequestsEmpty} />
      ) : (
        <ul className="border-t border-ink">
          {rows.map((r) => {
            const actions = side === "received" ? FREELANCER_REQUEST_ACTIONS[r.status] : CLIENT_REQUEST_ACTIONS[r.status];
            return (
              <li key={r.id} className="grid gap-4 border-b border-line py-5 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/${lang}/services/${r.service_id}`} className="text-lg font-bold hover:text-brand-600" dir="auto">{r.serviceTitle}</Link>
                    <StatusBadge tone={statusTone(r.status)}>{translate(dict, `market.rstatus_${r.status}`)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {interpolate(m.packageLine, { tier: translate(dict, `market.tier_${r.tier}`), price: money(fmt, r.price_minor, r.currency), days: fmt.number(r.delivery_days) })}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-ink-subtle">
                    <Person person={r.other} fallback="?" size="sm" />
                    <span>{interpolate(side === "received" ? m.requestFrom : m.requestTo, { name: r.other?.display_name || m.aClient })}</span>
                    <span>· {fmt.date(r.created_at)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-ink-muted" dir="auto">{r.message}</p>
                </div>
                {actions.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    {actions.map((a) => (
                      <StatusAction key={a} action={updateRequestStatusAction} locale={lang} id={r.id} status={a}
                        label={translate(dict, `market.ract_${a}`)} tone={a === "accepted" || a === "completed" ? "primary" : a === "cancelled" || a === "declined" ? "danger" : "secondary"} />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashShell>
  );
}
