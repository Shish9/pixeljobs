import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireStaff } from "@/lib/auth";
import { moderationLog } from "@/lib/trust";
import { EmptyState } from "@/components/ui/Card";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ModerationLogPage({ params }: PageProps<"/[lang]/admin/log">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireStaff(lang);
  const [dict, fmt, rows] = await Promise.all([getDictionary(lang), getFormatters(lang), moderationLog()]);
  const tr = dict.trust;
  return (
    <AdminShell locale={lang} dict={dict} current="/log">
      {rows.length === 0 ? (
        <EmptyState title={tr.logEmpty} />
      ) : (
        <ol className="border-t border-ink">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3">
              <time dateTime={r.created_at} className="w-40 shrink-0 text-sm text-ink-subtle">{fmt.date(r.created_at, { dateStyle: "medium", timeStyle: "short" })}</time>
              <span className="font-bold">{translate(dict, `trust.act_${r.action}`)}</span>
              <span>{translate(dict, `trust.target_${r.target_type}`)}</span>
              <span className="ltr-isolate font-mono text-xs text-ink-subtle">{r.target_id.slice(0, 8)}</span>
              <span className="text-sm text-ink-subtle">{interpolate(tr.logBy, { name: r.actor?.display_name || tr.someone })}</span>
              {r.note && <span className="basis-full text-sm" dir="auto">{r.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </AdminShell>
  );
}
