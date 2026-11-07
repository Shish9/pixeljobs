import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, Briefcase, Clapperboard, Code2, Compass, Languages, Megaphone, MessagesSquare, Package,
  PenLine, Ruler, ShieldCheck, Star, UserRound,
} from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatMoney } from "@/i18n/format";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Container } from "@/components/ui/Card";

export default async function HomePage({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const h = dict.home;
  const sp = await searchParams;

  const categories = [
    { key: "design", Icon: Compass },
    { key: "development", Icon: Code2 },
    { key: "writing", Icon: PenLine },
    { key: "translation", Icon: Languages },
    { key: "marketing", Icon: Megaphone },
    { key: "video", Icon: Clapperboard },
    { key: "business", Icon: Briefcase },
    { key: "engineering", Icon: Ruler },
  ] as const;

  const steps = [
    { title: h.step1Title, body: h.step1Body, Icon: UserRound },
    { title: h.step2Title, body: h.step2Body, Icon: MessagesSquare },
    { title: h.step3Title, body: h.step3Body, Icon: Star },
  ];

  return (
    <>
      {sp.signed_out === "1" && (
        <Container className="pt-6"><Alert tone="success">{dict.auth.signedOut}</Alert></Container>
      )}

      {/* Hero */}
      <section className="border-b border-line">
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-brand-700">{h.eyebrow}</p>
            <h1 className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-balance">
              {h.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">{h.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/${lang}/sign-up?intent=hire`} variant="dark" size="lg">
                {h.ctaHire} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href={`/${lang}/sign-up?intent=work`} variant="secondary" size="lg">
                {h.ctaWork}
              </ButtonLink>
            </div>
          </div>

          {/* Illustrative example of a service package — clearly labelled, not a real listing. */}
          <Card className="relative p-6 shadow-raised" role="img" aria-label={`${h.exampleBadge}: ${h.servicesTitle}`}>
            <Badge tone="warning" className="absolute end-4 top-4">{h.exampleBadge}</Badge>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-100 text-brand-700"><UserRound className="size-5" /></span>
              <div>
                <p className="font-semibold">{dict.categories.design}</p>
                <p className="text-sm text-ink-subtle">{dict.cities.erbil}</p>
              </div>
            </div>
            <p className="mt-5 text-lg font-bold">{h.servicesTitle}</p>
            <ul className="mt-4 divide-y divide-line rounded-md border border-line">
              {[
                { name: h.pkgBasic, amount: 150000, days: 3 },
                { name: h.pkgStandard, amount: 350000, days: 5 },
                { name: h.pkgPremium, amount: 700000, days: 7 },
              ].map((pkg) => (
                <li key={pkg.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{pkg.name}</span>
                  <span className="font-semibold">{formatMoney(pkg.amount, "IQD", lang)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </section>

      {/* Two paths */}
      <section aria-labelledby="paths" className="py-16 sm:py-20">
        <Container>
          <h2 id="paths" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{h.pathsTitle}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              { title: h.servicesTitle, body: h.servicesBody, Icon: Package },
              { title: h.projectsTitle, body: h.projectsBody, Icon: Briefcase },
            ].map(({ title, body, Icon }) => (
              <Card key={title} className="p-6 sm:p-7">
                <span className="grid size-10 place-items-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="steps" className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-20">
        <Container>
          <h2 id="steps" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{h.stepsTitle}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map(({ title, body, Icon }, i) => (
              <li key={title}>
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                  <Icon className="size-5 text-ink-subtle" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories" className="py-16 sm:py-20">
        <Container>
          <h2 id="categories" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{h.categoriesTitle}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
                <Icon className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
                <span className="font-medium">{dict.categories[key]}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Honesty + founder */}
      <section className="pb-8">
        <Container className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6 sm:p-7">
            <ShieldCheck className="size-6 text-success-700" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold">{h.honestyTitle}</h2>
            <p className="mt-2 leading-relaxed text-ink-muted">{h.honestyBody}</p>
          </Card>
          <Card className="p-6 sm:p-7">
            <h2 className="text-lg font-bold">{h.founderTitle}</h2>
            <p className="mt-2 leading-relaxed text-ink-muted">{h.founderBody}</p>
            <p className="mt-5 text-sm">
              <span className="font-semibold">{h.founderName}</span>
              <span className="text-ink-subtle"> · {h.founderRole}</span>
            </p>
          </Card>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <Container>
          <div className="rounded-xl bg-ink px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{h.finalTitle}</h2>
            <p className="mx-auto mt-3 max-w-md text-white/75">{h.finalBody}</p>
            <ButtonLink href={`/${lang}/sign-up`} variant="primary" size="lg" className="mt-7">
              {dict.nav.signUp}
            </ButtonLink>
            <p className="mt-6 text-sm">
              <Link href={`/${lang}/jobs`} className="text-white/80 underline-offset-4 hover:text-white hover:underline">
                {h.jobsLink}
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
