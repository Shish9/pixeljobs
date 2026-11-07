import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireOnboardedViewer } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { ProjectForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewProjectPage({ params }: PageProps<"/[lang]/dashboard/projects/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/projects/new`);
  const dict = await getDictionary(lang);
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/projects" title={dict.market.newProject} requires="client">
      {!viewer.emailConfirmed && <Alert tone="warning" className="mb-6">{dict.errors.actionEmail}</Alert>}
      <div className="max-w-3xl"><ProjectForm locale={lang} m={pickMarketMessages(dict)} /></div>
    </DashShell>
  );
}
