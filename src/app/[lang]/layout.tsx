import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { isLocale, localeMeta, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSiteUrl } from "@/lib/supabase/env";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

// Noto Naskh Arabic covers Arabic and Kurdish (ڕ ڵ ێ ۆ ە ڤ) glyphs that Plus Jakarta Sans lacks.
const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: dict.meta.title, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(locales.map((l) => [localeMeta[l].htmlLang, `/${l}`])),
    },
    openGraph: { siteName: dict.meta.siteName, title: dict.meta.title, description: dict.meta.description, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#fbf9f4", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { dir, htmlLang } = localeMeta[lang];

  return (
    <html lang={htmlLang} dir={dir} className={`${jakarta.variable} ${naskh.variable}`}>
      <body className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={lang} dict={dict} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter locale={lang} dict={dict} />
      </body>
    </html>
  );
}
