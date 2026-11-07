import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { deleteServiceAction, setServiceStatusAction } from "@/lib/actions/market";
import { getService } from "@/lib/market";
import { mediaUrl, type Tier } from "@/lib/taxonomy";
import { Alert } from "@/components/ui/Alert";
import { ServiceEditor } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";
import { StatusAction, StatusBadge, statusTone } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function EditServicePage({ params, searchParams }: PageProps<"/[lang]/dashboard/services/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/services/${id}`);
  const [dict, data, sp] = await Promise.all([getDictionary(lang), getService(id), searchParams]);
  if (!data || data.service.owner_id !== viewer.user.id) notFound();
  const { service, packages } = data;
  const m = dict.market;
  const faqs = Array.isArray(service.faqs) ? (service.faqs as { q: string; a: string }[]) : [];
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/services" title={m.editService} requires="freelancer"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={statusTone(service.status)}>{translate(dict, `market.status_${service.status}`)}</StatusBadge>
          {service.status === "published" && (
            <>
              <Link className="text-sm font-semibold underline underline-offset-4" href={`/${lang}/services/${service.id}`}>{m.view}</Link>
              <StatusAction action={setServiceStatusAction} locale={lang} id={service.id} status="draft" label={m.unpublish} />
              <StatusAction action={setServiceStatusAction} locale={lang} id={service.id} status="archived" label={m.archive} />
            </>
          )}
          {service.status === "archived" && <StatusAction action={setServiceStatusAction} locale={lang} id={service.id} status="draft" label={m.unpublish} />}
          {service.status === "draft" && (
            <form action={deleteServiceAction}>
              <input type="hidden" name="locale" value={lang} />
              <input type="hidden" name="id" value={service.id} />
              <button type="submit" className="min-h-10 rounded-md border border-danger-700 px-3 text-sm font-semibold text-danger-700 hover:bg-danger-50">{m.delete}</button>
            </form>
          )}
        </div>
      }>
      {sp.saved === "publish" && <Alert tone="success" className="mb-6">{m.publishedOk}</Alert>}
      {sp.saved === "draft" && <Alert tone="success" className="mb-6">{m.draftSaved}</Alert>}
      {!viewer.emailConfirmed && <Alert tone="warning" className="mb-6">{dict.errors.actionEmail}</Alert>}
      <ServiceEditor
        locale={lang}
        m={pickMarketMessages(dict)}
        service={{ id: service.id, title: service.title, category: service.category, description: service.description, requirements: service.requirements, city: service.city, languages: service.languages, faqs, status: service.status }}
        packages={packages.map((p) => ({ ...p, tier: p.tier as Tier }))}
        coverUrl={mediaUrl(service.cover_path)}
      />
    </DashShell>
  );
}
