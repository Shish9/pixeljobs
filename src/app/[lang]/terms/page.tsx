import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">) {
  return legalMetadata((await params).lang, "terms");
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  return <LegalPage lang={(await params).lang} page="terms" />;
}
