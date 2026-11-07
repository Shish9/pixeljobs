import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { getViewer } from "@/lib/auth";
import { getPublicProfile, savedSet } from "@/lib/market";
import { mediaUrl } from "@/lib/taxonomy";
import { safeExternalUrl } from "@/lib/text";
import { Container } from "@/components/ui/Card";
import { Person, SaveButton, ServiceTile, StatusBadge, money } from "@/components/market/parts";

export async function generateMetadata({ params }: PageProps<"/[lang]/u/[username]">): Promise<Metadata> {
  const { lang, username } = await params;
  if (!isLocale(lang)) return {};
  const data = await getPublicProfile(username);
  if (!data) return { robots: { index: false } };
  return { title: data.profile.display_name || `@${username}`, description: data.profile.headline ?? undefined };
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/u/[username]">) {
  const { lang, username } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, fmt, data, viewer] = await Promise.all([getDictionary(lang), getFormatters(lang), getPublicProfile(username), getViewer()]);
  if (!data) notFound();
  const { profile: p, entries, portfolio, services } = data;
  const m = dict.market;
  const isSelf = viewer?.user.id === p.id;
  const saved = (await savedSet(viewer?.user.id)).has(`freelancer:${p.id}`);
  const website = safeExternalUrl(p.website_url);
  const groups = [
    { kind: "experience", title: m.experienceTitle },
    { kind: "education", title: m.educationTitle },
    { kind: "certification", title: m.certificationsTitle },
  ].map((g) => ({ ...g, items: entries.filter((e) => e.kind === g.kind) })).filter((g) => g.items.length > 0);
  const years = (s: number | null, e: number | null) =>
    s ? `${fmt.number(s, { useGrouping: false })} – ${e ? fmt.number(e, { useGrouping: false }) : m.present}` : e ? fmt.number(e, { useGrouping: false }) : "";

  return (
    <Container className="py-10 sm:py-14">
      <header className="flex flex-col gap-6 border-b border-ink pb-8 sm:flex-row sm:items-center">
        <Person person={p} fallback={p.display_name || username} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-extrabold tracking-tight rtl:tracking-normal">{p.display_name || `@${username}`}</h1>
          {p.headline && <p className="mt-1 text-xl text-ink-muted">{p.headline}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-subtle">
            <span className="ltr-isolate">@{p.username}</span>
            {p.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{translate(dict, `cities.${p.city}`)}</span>}
            {p.is_freelancer && <StatusBadge tone={p.availability === "available" ? "green" : "amber"}>{translate(dict, `market.avail_${p.availability}`)}</StatusBadge>}
            {p.rate_minor && <span className="bg-accent-200 px-1.5 font-bold text-ink">{interpolate(m.rateFrom, { price: money(fmt, p.rate_minor, p.rate_currency) })}</span>}
            <span>{interpolate(m.memberSince, { date: fmt.date(p.created_at, { year: "numeric", month: "long" }) })}</span>
          </p>
        </div>
        <div className="flex gap-3">
          {website && <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-10 items-center gap-2 rounded-md border border-ink px-3 text-sm font-semibold hover:bg-sunken">{m.fLink}<ExternalLink className="size-4" aria-hidden="true" /></a>}
          {viewer && !isSelf && <SaveButton locale={lang} itemType="freelancer" itemId={p.id} saved={saved} label={m.save} savedLabel={m.unsave} />}
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-12">
          {p.bio && <p className="text-lg leading-relaxed whitespace-pre-line text-ink-muted" dir="auto">{p.bio}</p>}

          {services.length > 0 && (
            <section aria-labelledby="svc">
              <h2 id="svc" className="border-b border-ink pb-2 text-xl font-extrabold">{m.servicesBy}</h2>
              <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2">
                {services.map((s) => <li key={s.id}><ServiceTile service={s} locale={lang} dict={dict} fmt={fmt} /></li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="pf">
            <h2 id="pf" className="border-b border-ink pb-2 text-xl font-extrabold">{m.portfolioTitle}</h2>
            {portfolio.length === 0 ? (
              <p className="py-6 text-ink-subtle">{m.noPortfolio}</p>
            ) : (
              <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2">
                {portfolio.map((item) => {
                  const img = mediaUrl(item.image_path);
                  const link = safeExternalUrl(item.link_url);
                  return (
                    <li key={item.id} dir="auto">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element -- user upload from Supabase storage
                        <img src={img} alt="" className="aspect-[4/3] w-full rounded-md border border-line object-cover" />
                      )}
                      <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
                      {item.description && <p className="mt-1 text-ink-muted">{item.description}</p>}
                      {item.outcome && <p className="mt-2 text-sm font-semibold text-brand-700">{item.outcome}</p>}
                      {link && <a className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4" href={link} target="_blank" rel="noopener noreferrer nofollow">{m.fLink}<ExternalLink className="size-3.5" aria-hidden="true" /></a>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          {p.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-wide uppercase rtl:text-base rtl:tracking-normal">{m.fSkills}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{p.skills.map((s) => <li key={s} className="bg-sunken px-2.5 py-1 text-sm">{s}</li>)}</ul>
            </section>
          )}
          {p.languages.length > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-wide uppercase rtl:text-base rtl:tracking-normal">{m.fLanguages}</h2>
              <p className="mt-2">{p.languages.map((l) => translate(dict, `market.lang_${l}`)).join(" · ")}</p>
            </section>
          )}
          {groups.map((g) => (
            <section key={g.kind}>
              <h2 className="border-b border-ink pb-2 text-sm font-bold tracking-wide uppercase rtl:text-base rtl:tracking-normal">{g.title}</h2>
              <ul>
                {g.items.map((e) => (
                  <li key={e.id} className="border-b border-line py-3" dir="auto">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-ink-subtle">{[e.organization, years(e.start_year, e.end_year)].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </div>
    </Container>
  );
}
