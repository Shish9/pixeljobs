import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/guidelines">) {
  return legalMetadata((await params).lang, "guidelines");
}

export default async function GuidelinesPage({ params }: PageProps<"/[lang]/guidelines">) {
  return <LegalPage lang={(await params).lang} page="guidelines" />;
}
