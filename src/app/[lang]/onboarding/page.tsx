import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireViewer } from "@/lib/auth";
import { OnboardingForm } from "@/components/account/AccountForms";
import { pickAccountMessages } from "@/components/account/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/onboarding">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).onboarding.title, robots: { index: false } };
}

export default async function OnboardingPage({ params }: PageProps<"/[lang]/onboarding">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireViewer(lang, `/${lang}/onboarding`);
  if (viewer.profile.onboarded_at) redirect(`/${lang}/dashboard`);
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">{dict.onboarding.title}</h1>
      <p className="mt-2 text-ink-muted">{dict.onboarding.subtitle}</p>
      <div className="mt-8 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <OnboardingForm
          locale={lang}
          m={pickAccountMessages(dict)}
          defaults={{
            city: viewer.profile.city,
            isClient: viewer.profile.is_client,
            isFreelancer: viewer.profile.is_freelancer,
          }}
        />
      </div>
    </div>
  );
}
