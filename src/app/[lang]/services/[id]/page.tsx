import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, RefreshCw } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { getViewer } from "@/lib/auth";
import { getService, savedSet } from "@/lib/market";
import { mediaUrl, type Tier } from "@/lib/taxonomy";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Card";
import { RequestForm } from "@/components/market/MarketForms";
import { pickMarketMessages } from "@/components/market/messages";
import { Person, SaveButton, StatusBadge, money, statusTone } from "@/components/market/parts";

export async function generateMetadata({ params }: PageProps<"/[lang]/services/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const data = await getService(id);
  if (!data) return {};
  return { title: data.service.title, description: data.service.description.slice(0, 160) };
}

export default async function ServicePage({ params }: PageProps<"/[lang]/services/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, fmt, data, viewer] = await Promise.all([getDictionary(lang), getFormatters(lang), getService(id), getViewer()]);
  if (!data) notFound();
  const { service, packages, owner } = data;
  const m = dict.market;
  const isOwner = viewer?.user.id === service.owner_id;
  const saved = (await savedSet(viewer?.user.id)).has(`service:${service.id}`);
  const cover = mediaUrl(service.cover_path);
  const faqs = Array.isArray(service.faqs) ? (service.faqs as { q: string; a: string }[]) : [];
  const priceLabels = Object.fromEntries(packages.map((p) => [p.tier, money(fmt, p.price_minor, p.currency)]));

  return (
    <Container className="py-8 sm:py-12">
      <Link href={`/${lang}/services`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-subtle hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {m.servicesTitle}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <article className="min-w-0" dir="auto">
          <p className="text-sm font-bold tracking-wide text-ink-subtle uppercase rtl:tracking-normal">{translate(dict, `categories.${service.category}`)}</p>
          <h1 className="mt-2 text-h1 font-extrabold tracking-tight rtl:tracking-normal">{service.title}</h1>
          {service.status !== "published" && <div className="mt-3"><StatusBadge tone={statusTone(service.status)}>{translate(dict, `market.status_${service.status}`)}</StatusBadge></div>}

          <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-line py-4">
            <Person person={owner} fallback="?" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{owner?.display_name ?? "—"}</p>
              <p className="text-sm text-ink-subtle">
                {[service.city && translate(dict, `cities.${service.city}`), service.languages.map((l) => translate(dict, `market.lang_${l}`)).join(", ")].filter(Boolean).join(" · ")}
              </p>
            </div>
            {owner?.username && <Link className="text-sm font-semibold underline underline-offset-4" href={`/${lang}/u/${owner.username}`}>{m.viewProfile}</Link>}
            {viewer && !isOwner && <SaveButton locale={lang} itemType="service" itemId={service.id} saved={saved} label={m.save} savedLabel={m.unsave} />}
          </div>

          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- user upload from Supabase storage
            <img src={cover} alt="" className="mt-6 aspect-[16/9] w-full rounded-md border border-line object-cover" />
          )}

          <section className="mt-8">
            <h2 className="text-xl font-extrabold">{m.aboutService}</h2>
            <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink-muted">{service.description}</p>
          </section>
          {service.requirements && (
            <section className="mt-8">
              <h2 className="text-xl font-extrabold">{m.requirementsTitle}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-muted">{service.requirements}</p>
            </section>
          )}

          <section className="mt-10" aria-labelledby="pkgs">
            <h2 id="pkgs" className="border-b border-ink pb-2 text-xl font-extrabold">{m.packagesTitle}</h2>
            {packages.length === 0 ? (
              <p className="py-4 text-ink-subtle">{m.noPackages}</p>
            ) : (
              <div className="grid md:grid-cols-3">
                {packages.map((p, i) => (
                  <div key={p.tier} className={`py-5 ${i > 0 ? "border-t border-line md:border-t-0 md:border-s md:ps-5" : ""} ${i < packages.length - 1 ? "md:pe-5" : ""}`}>
                    <p className="text-sm font-bold text-ink-subtle">{translate(dict, `market.tier_${p.tier}`)}</p>
                    <p className="mt-1 text-lg font-bold">{p.title}</p>
                    <p className="mt-2 inline-block bg-accent-200 px-1.5 text-xl font-extrabold">{money(fmt, p.price_minor, p.currency)}</p>
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-subtle">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{interpolate(m.deliveryIn, { days: fmt.number(p.delivery_days) })}</span>
                      <span className="inline-flex items-center gap-1"><RefreshCw className="size-3.5" aria-hidden="true" />{interpolate(m.revisionsN, { n: fmt.number(p.revisions) })}</span>
                    </p>
                    {p.deliverables.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-sm">
                        {p.deliverables.map((d) => (
                          <li key={d} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {faqs.length > 0 && (
            <section className="mt-10" aria-labelledby="faqs">
              <h2 id="faqs" className="border-b border-ink pb-2 text-xl font-extrabold">{m.faqsTitle}</h2>
              <dl>
                {faqs.map((f) => (
                  <div key={f.q} className="border-b border-line py-4">
                    <dt className="font-bold">{f.q}</dt>
                    <dd className="mt-1 text-ink-muted">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-ink bg-surface p-5">
            {isOwner ? (
              <div className="space-y-3">
                <Alert>{m.ownService}</Alert>
                <ButtonLink href={`/${lang}/dashboard/services/${service.id}`} variant="secondary" className="w-full">{m.editService}</ButtonLink>
              </div>
            ) : !viewer ? (
              <ButtonLink href={`/${lang}/sign-in?next=${encodeURIComponent(`/${lang}/services/${service.id}`)}`} className="w-full" size="lg">{m.signInToRequest}</ButtonLink>
            ) : !viewer.profile.is_client ? (
              <Alert>{m.enableClientToRequest}</Alert>
            ) : packages.length > 0 && service.status === "published" ? (
              <RequestForm locale={lang} m={pickMarketMessages(dict)} serviceId={service.id} tiers={packages.map((p) => p.tier as Tier)} priceLabels={priceLabels} />
            ) : (
              <p className="text-ink-subtle">{m.noPackages}</p>
            )}
          </div>
          <p className="mt-3 bg-accent-100 p-4 text-sm leading-relaxed text-accent-800">{m.paymentNote}</p>
        </aside>
      </div>
    </Container>
  );
}
