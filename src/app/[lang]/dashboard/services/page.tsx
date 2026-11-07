import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { myServices } from "@/lib/market";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { StatusBadge, money, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function DashServicesPage({ params }: PageProps<"/[lang]/dashboard/services">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/services`);
  const [dict, fmt, services] = await Promise.all([getDictionary(lang), getFormatters(lang), myServices(viewer.user.id)]);
  const m = dict.market;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/services" title={m.navServices} requires="freelancer"
      action={<ButtonLink href={`/${lang}/dashboard/services/new`} variant="dark">{m.newService}</ButtonLink>}>
      {services.length === 0 ? (
        <EmptyState title={m.dashServicesEmpty} action={<ButtonLink href={`/${lang}/dashboard/services/new`}>{m.newService}</ButtonLink>} />
      ) : (
        <ul className="border-t border-ink">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-4">
              <Link href={`/${lang}/dashboard/services/${s.id}`} className="min-w-0 flex-1 text-lg font-bold hover:text-brand-600" dir="auto">{s.title}</Link>
              <StatusBadge tone={statusTone(s.status)}>{translate(dict, `market.status_${s.status}`)}</StatusBadge>
              <span className="text-sm text-ink-subtle">{s.fromPrice !== null ? interpolate(m.from, { price: money(fmt, s.fromPrice, s.currency) }) : m.noPackages}</span>
              {s.status === "published" && <Link className="text-sm underline underline-offset-4" href={`/${lang}/services/${s.id}`}>{m.view}</Link>}
            </li>
          ))}
        </ul>
      )}
    </DashShell>
  );
}
