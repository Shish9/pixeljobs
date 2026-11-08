import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { AuthShell, pickAuthMessages } from "../AuthShell";
import { SignUpForm } from "../AuthForms";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-up">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.signUpTitle };
}

export default async function SignUpPage({ params }: PageProps<"/[lang]/sign-up">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <AuthShell
      title={dict.auth.signUpTitle}
      subtitle={dict.auth.signUpSubtitle}
      footer={<>{dict.auth.haveAccount}{" "}<Link className="font-semibold text-brand-700 hover:underline" href={`/${lang}/sign-in`}>{dict.nav.signIn}</Link></>}
    >
      <SignUpForm locale={lang} m={pickAuthMessages(dict)} />
      <p className="mt-4 text-sm text-ink-subtle">
        {dict.trust.agreeLead}{" "}
        <Link className="underline underline-offset-4 hover:text-ink" href={`/${lang}/terms`}>{dict.trust.terms}</Link>
        {" · "}
        <Link className="underline underline-offset-4 hover:text-ink" href={`/${lang}/guidelines`}>{dict.trust.guidelines}</Link>
        {" · "}
        <Link className="underline underline-offset-4 hover:text-ink" href={`/${lang}/privacy`}>{dict.trust.privacy}</Link>
      </p>
    </AuthShell>
  );
}
