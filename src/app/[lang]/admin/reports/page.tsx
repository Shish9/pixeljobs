import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireStaff } from "@/lib/auth";
import { reportQueue, type QueueRow } from "@/lib/trust";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/Card";
import { StatusBadge } from "@/components/market/parts";
import { AdminShell, ModerationForm } from "@/components/admin/AdminShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const FILTERS = ["active", "actioned", "dismissed"] as const;
type Filter = (typeof FILTERS)[number];

function targetHref(locale: Locale, r: QueueRow): string | null {
  switch (r.target_type) {
    case "service": return `/${locale}/services/${r.target_id}`;
    case "project": return `/${locale}/projects/${r.target_id}`;
    case "user":
    case "portfolio":
    case "review": return r.owner?.username ? `/${locale}/u/${r.owner.username}` : null;
    default: return null; // messages are private: the snapshot is all staff see
  }
}

/** Decision buttons offered for the item's current state. */
function decisions(r: QueueRow) {
  const out: { action: string; tone: "danger" | "secondary" | "primary" }[] = [];
  const state = r.targetStatus ?? "ok";
  if (r.target_type === "user") out.push(state === "suspended" ? { action: "reinstate", tone: "primary" } : { action: "suspend", tone: "danger" });
  else if (r.target_type === "review" || r.target_type === "message") out.push(state === "hidden" ? { action: "restore", tone: "primary" } : { action: "hide", tone: "danger" });
  else out.push(state === "suspended" ? { action: "restore", tone: "primary" } : { action: "suspend", tone: "danger" });
  if (r.status === "open") out.push({ action: "reviewing", tone: "secondary" });
  out.push({ action: "dismiss", tone: "secondary" });
  return out;
}

export default async function ReportsPage({ params, searchParams }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireStaff(lang);
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.status as Filter) ? (sp.status as Filter) : "active";
  const [dict, fmt, rows] = await Promise.all([getDictionary(lang), getFormatters(lang), reportQueue(filter)]);
  const tr = dict.trust;
  const label = { active: tr.filterActive, actioned: tr.filterActioned, dismissed: tr.filterDismissed };

  return (
    <AdminShell locale={lang} dict={dict} current="/reports">
      <nav aria-label={tr.tabQueue} className="mb-6 flex flex-wrap gap-6">
        {FILTERS.map((f) => (
          <Link key={f} href={`/${lang}/admin/reports?status=${f}`} aria-current={filter === f ? "page" : undefined}
            className={cn("inline-flex min-h-11 items-center border-b-[3px] px-1", filter === f ? "border-brand-600 font-bold" : "border-transparent text-ink-subtle")}>
            {label[f]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title={tr.queueEmpty} />
      ) : (
        <ul className="border-t border-ink">
          {rows.map((r) => {
            const href = targetHref(lang, r);
            const active = r.status === "open" || r.status === "reviewing";
            return (
              <li key={r.id} className="grid gap-5 border-b border-line py-6 lg:grid-cols-[1fr_360px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold">{translate(dict, `trust.target_${r.target_type}`)}</span>
                    <StatusBadge tone={r.status === "open" ? "red" : r.status === "reviewing" ? "amber" : "neutral"}>{translate(dict, `trust.rstatus_${r.status}`)}</StatusBadge>
                    <span className="text-sm font-semibold">{translate(dict, `trust.reason_${r.reason}`)}</span>
                    <span className="text-sm text-ink-subtle">{fmt.date(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-subtle">
                    {interpolate(tr.reportedBy, { name: r.reporter?.display_name || tr.someone })}
                    {" · "}
                    {interpolate(tr.ownedBy, { name: r.owner?.display_name || tr.someone })}
                    {r.targetStatus && ` · ${interpolate(tr.currently, { state: translate(dict, `trust.state_${r.targetStatus}`) })}`}
                  </p>
                  {r.snapshot && (
                    <figure className="mt-3 border-s-[3px] border-line ps-4">
                      <figcaption className="text-xs font-bold text-ink-subtle uppercase rtl:text-sm">{tr.reportedCopy}</figcaption>
                      <blockquote className="mt-1 whitespace-pre-line break-words" dir="auto">{r.snapshot}</blockquote>
                    </figure>
                  )}
                  {r.details && (
                    <p className="mt-3 text-sm"><span className="font-semibold">{tr.reporterNote}: </span><span dir="auto">{r.details}</span></p>
                  )}
                  {r.resolution_note && <p className="mt-2 text-sm text-ink-subtle" dir="auto">{r.resolution_note}</p>}
                  {href && <Link href={href} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{tr.open}</Link>}
                </div>
                {active && (
                  <div className="space-y-4">
                    <ModerationForm locale={lang} dict={dict} targetType={r.target_type} targetId={r.target_id} reportId={r.id}
                      actions={decisions(r)} />
                    {r.target_type !== "user" && r.target_owner && r.ownerStatus !== "suspended" && (
                      <details className="text-sm">
                        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{interpolate(tr.ownedBy, { name: r.owner?.display_name || tr.someone })}</summary>
                        <ModerationForm locale={lang} dict={dict} targetType="user" targetId={r.target_owner} reportId={r.id} actions={[{ action: "suspend", tone: "danger" }]} />
                      </details>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
