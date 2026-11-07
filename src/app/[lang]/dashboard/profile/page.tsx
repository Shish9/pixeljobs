import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { deleteEntryAction } from "@/lib/actions/market";
import { myEntries } from "@/lib/market";
import { EntryForm, ProfileDetailsForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";

export const metadata: Metadata = { robots: { index: false } };

export default async function DashProfilePage({ params }: PageProps<"/[lang]/dashboard/profile">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/profile`);
  const [dict, fmt, entries] = await Promise.all([getDictionary(lang), getFormatters(lang), myEntries(viewer.user.id)]);
  const m = dict.market;
  const p = viewer.profile;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/profile" title={m.profileDetails} requires="freelancer"
      action={p.username ? <Link className="font-semibold underline underline-offset-4" href={`/${lang}/u/${p.username}`}>{m.publicProfile}</Link> : <p className="text-sm text-ink-subtle">{m.needUsername}</p>}>
      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-label={m.profileDetails}>
          <ProfileDetailsForm locale={lang} m={pickMarketMessages(dict)}
            defaults={{ skills: p.skills, languages: p.languages, availability: p.availability, rate: p.rate_minor, websiteUrl: p.website_url }} />
        </section>
        <section aria-labelledby="entries">
          <h2 id="entries" className="border-b border-ink pb-2 text-xl font-extrabold">{m.entriesTitle}</h2>
          <ul className="mb-6">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4 border-b border-line py-3">
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-ink-subtle">
                    {[translate(dict, `market.entry_${e.kind}`), e.organization, e.start_year && fmt.number(e.start_year, { useGrouping: false })].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <form action={deleteEntryAction}>
                  <input type="hidden" name="locale" value={lang} />
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="min-h-10 text-sm font-semibold text-danger-700 underline underline-offset-4">{m.remove}</button>
                </form>
              </li>
            ))}
          </ul>
          <EntryForm locale={lang} m={pickMarketMessages(dict)} />
        </section>
      </div>
    </DashShell>
  );
}
