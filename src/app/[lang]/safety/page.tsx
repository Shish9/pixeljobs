import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/safety">) {
  return legalMetadata((await params).lang, "safety");
}

export default async function SafetyPage({ params }: PageProps<"/[lang]/safety">) {
  return <LegalPage lang={(await params).lang} page="safety" />;
}
