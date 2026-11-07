import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { AuthShell, pickAuthMessages } from "../AuthShell";
import { ForgotPasswordForm } from "../AuthForms";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.forgotTitle, robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <AuthShell
      title={dict.auth.forgotTitle}
      subtitle={dict.auth.forgotSubtitle}
      footer={<Link className="font-semibold text-brand-700 hover:underline" href={`/${lang}/sign-in`}>{dict.common.back}</Link>}
    >
      <ForgotPasswordForm locale={lang} m={pickAuthMessages(dict)} />
    </AuthShell>
  );
}
