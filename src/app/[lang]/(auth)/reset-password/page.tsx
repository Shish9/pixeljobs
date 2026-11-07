import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getViewer } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { AuthShell, pickAuthMessages } from "../AuthShell";
import { ResetPasswordForm } from "../AuthForms";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: (await getDictionary(lang)).auth.resetTitle, robots: { index: false } };
}

/** Reached from the recovery email: /auth/callback exchanges the code for a session, then redirects here. */
export default async function ResetPasswordPage({ params }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const viewer = await getViewer();
  return (
    <AuthShell title={dict.auth.resetTitle}>
      {viewer ? (
        <ResetPasswordForm locale={lang} m={pickAuthMessages(dict)} />
      ) : (
        <div className="space-y-5">
          <Alert tone="danger">{dict.auth.linkInvalid}</Alert>
          <ButtonLink href={`/${lang}/forgot-password`} variant="secondary" className="w-full">
            {dict.auth.forgotButton}
          </ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
