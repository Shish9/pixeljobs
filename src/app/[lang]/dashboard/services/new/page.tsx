import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireOnboardedViewer } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { ServiceEditor } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewServicePage({ params }: PageProps<"/[lang]/dashboard/services/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/services/new`);
  const dict = await getDictionary(lang);
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/services" title={dict.market.newService} requires="freelancer">
      {!viewer.emailConfirmed && <Alert tone="warning" className="mb-6">{dict.errors.actionEmail}</Alert>}
      <ServiceEditor locale={lang} m={pickMarketMessages(dict)} packages={[]} coverUrl={null} />
    </DashShell>
  );
}
