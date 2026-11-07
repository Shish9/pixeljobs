import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { safeRedirectPath } from "@/lib/validation";
import { Alert } from "@/components/ui/Alert";
import { AuthShell, pickAuthMessages } from "../AuthShell";
import { SignInForm } from "../AuthForms";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-in">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.signInTitle, robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[lang]/sign-in">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next, "") || undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;

  return (
    <AuthShell
      title={dict.auth.signInTitle}
      subtitle={dict.auth.signInSubtitle}
      footer={<>{dict.auth.noAccount}{" "}<Link className="font-semibold text-brand-700 hover:underline" href={`/${lang}/sign-up`}>{dict.nav.signUp}</Link></>}
    >
      {sp.error === "link" && <Alert tone="danger" className="mb-5">{dict.auth.linkInvalid}</Alert>}
      {status && status !== "active" && <Alert tone="warning" className="mb-5">{dict.errors.forbidden}</Alert>}
      <SignInForm locale={lang} m={pickAuthMessages(dict)} next={next} />
    </AuthShell>
  );
}
