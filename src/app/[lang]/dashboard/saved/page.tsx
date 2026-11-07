import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { requireOnboardedViewer } from "@/lib/auth";
import { savedItems } from "@/lib/market";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { Person, ProjectLine, SaveButton, ServiceTile } from "@/components/market/parts";

export const metadata: Metadata = { robots: { index: false } };

export default async function SavedPage({ params }: PageProps<"/[lang]/dashboard/saved">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/saved`);
  const [dict, fmt, saved] = await Promise.all([getDictionary(lang), getFormatters(lang), savedItems(viewer.user.id)]);
  const m = dict.market;
  const empty = saved.services.length + saved.projects.length + saved.freelancers.length === 0;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/saved" title={m.navSaved}>
      {empty ? (
        <EmptyState title={m.dashSavedEmpty} />
      ) : (
        <div className="space-y-12">
          {saved.services.length > 0 && (
            <section aria-labelledby="sv">
              <h2 id="sv" className="border-b border-ink pb-2 text-xl font-extrabold">{m.savedServices}</h2>
              <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {saved.services.map((s) => <li key={s.id}><ServiceTile service={s} locale={lang} dict={dict} fmt={fmt} /></li>)}
              </ul>
            </section>
          )}
          {saved.projects.length > 0 && (
            <section aria-labelledby="pj">
              <h2 id="pj" className="border-b border-ink pb-2 text-xl font-extrabold">{m.savedProjects}</h2>
              <ul>{saved.projects.map((p) => <ProjectLine key={p.id} project={{ ...p, client: null }} locale={lang} dict={dict} fmt={fmt} />)}</ul>
            </section>
          )}
          {saved.freelancers.length > 0 && (
            <section aria-labelledby="fr">
              <h2 id="fr" className="border-b border-ink pb-2 text-xl font-extrabold">{m.savedFreelancers}</h2>
              <ul>
                {saved.freelancers.map((f) => (
                  <li key={f.id} className="flex items-center gap-4 border-b border-line py-4">
                    <Person person={f} fallback="?" />
                    <div className="min-w-0 flex-1">
                      {f.username ? <Link href={`/${lang}/u/${f.username}`} className="font-bold hover:text-brand-600">{f.display_name}</Link> : <span className="font-bold">{f.display_name}</span>}
                      {f.headline && <p className="text-sm text-ink-subtle">{f.headline}</p>}
                    </div>
                    <SaveButton locale={lang} itemType="freelancer" itemId={f.id} saved label={m.save} savedLabel={m.unsave} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </DashShell>
  );
}
