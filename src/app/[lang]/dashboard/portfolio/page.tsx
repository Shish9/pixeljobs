import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireOnboardedViewer } from "@/lib/auth";
import { deletePortfolioAction } from "@/lib/actions/market";
import { myPortfolio } from "@/lib/market";
import { mediaUrl } from "@/lib/taxonomy";
import { EmptyState } from "@/components/ui/Card";
import { PortfolioForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { DashShell } from "@/components/market/DashShell";

export const metadata: Metadata = { robots: { index: false } };

export default async function DashPortfolioPage({ params }: PageProps<"/[lang]/dashboard/portfolio">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/portfolio`);
  const [dict, items] = await Promise.all([getDictionary(lang), myPortfolio(viewer.user.id)]);
  const m = dict.market;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/portfolio" title={m.portfolioTitle} requires="freelancer">
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <section aria-label={m.portfolioTitle}>
          {items.length === 0 ? (
            <EmptyState title={m.dashPortfolioEmpty} />
          ) : (
            <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {items.map((item) => {
                const img = mediaUrl(item.image_path);
                return (
                  <li key={item.id}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user upload
                      <img src={img} alt="" className="aspect-[4/3] w-full rounded-md border border-line object-cover" />
                    ) : (
                      <div aria-hidden="true" className="aspect-[4/3] rounded-md border border-line bg-sunken" />
                    )}
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <p className="font-bold" dir="auto">{item.title}</p>
                      <form action={deletePortfolioAction}>
                        <input type="hidden" name="locale" value={lang} />
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="min-h-10 text-sm font-semibold text-danger-700 underline underline-offset-4">{m.remove}</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section aria-labelledby="add-work" className="rounded-md border border-ink bg-surface p-5 lg:self-start">
          <h2 id="add-work" className="mb-4 text-xl font-extrabold">{m.add}</h2>
          <PortfolioForm locale={lang} m={pickMarketMessages(dict)} />
        </section>
      </div>
    </DashShell>
  );
}
