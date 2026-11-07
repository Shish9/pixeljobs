import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireOnboardedViewer } from "@/lib/auth";
import { avatarUrl } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { Card, Container } from "@/components/ui/Card";
import { AvatarForm, PreferencesForm, PrivacyForm, ProfileForm } from "@/components/account/AccountForms";
import { pickAccountMessages } from "@/components/account/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/settings">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).settings.title, robots: { index: false } };
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-line py-8 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h2 id={id} className="font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      <Card className="p-5 sm:p-6">{children}</Card>
    </section>
  );
}

export default async function SettingsPage({ params, searchParams }: PageProps<"/[lang]/settings">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/settings`);
  const dict = await getDictionary(lang);
  const m = pickAccountMessages(dict);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: settings } = (await supabase?.from("account_settings").select("marketing_emails, digit_style").eq("user_id", viewer.user.id).single()) ?? { data: null };
  const p = viewer.profile;

  return (
    <Container className="max-w-5xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">{dict.settings.title}</h1>
      {sp.saved === "1" && <Alert tone="success" className="mt-6">{dict.common.saved}</Alert>}

      <div className="mt-8">
        <Section id="profile" title={dict.settings.profileSection} description={dict.settings.profileHelp}>
          <div className="space-y-8">
            <AvatarForm locale={lang} m={m} current={avatarUrl(p.avatar_path)} />
            <ProfileForm locale={lang} m={m} defaults={{ displayName: p.display_name, username: p.username, headline: p.headline, bio: p.bio, city: p.city }} />
          </div>
        </Section>

        <Section id="preferences" title={dict.settings.preferencesSection}>
          <PreferencesForm
            locale={lang}
            m={m}
            defaults={{ preferredLocale: p.preferred_locale, preferredCurrency: p.preferred_currency, digitStyle: settings?.digit_style ?? "native", isClient: p.is_client, isFreelancer: p.is_freelancer }}
          />
        </Section>

        <Section id="privacy" title={dict.settings.privacySection}>
          <PrivacyForm locale={lang} m={m} defaults={{ visibility: p.visibility, marketingEmails: settings?.marketing_emails ?? false }} />
        </Section>

        <Section id="account" title={dict.settings.accountSection}>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold">{dict.settings.emailLabel}</dt>
              <dd className="ltr-isolate mt-0.5 text-ink-muted">{viewer.user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold">{dict.onboarding.username}</dt>
              <dd className="ltr-isolate mt-0.5 text-ink-muted">{p.username ? `@${p.username}` : "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold">{dict.settings.securitySection}</dt>
              <dd className="mt-0.5">
                <Link href={`/${lang}/reset-password`} className="font-semibold text-brand-700 hover:underline">
                  {dict.settings.changePassword}
                </Link>
              </dd>
            </div>
          </dl>
        </Section>
      </div>
    </Container>
  );
}
