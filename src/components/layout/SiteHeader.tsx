import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { getViewer } from "@/lib/auth";
import { avatarUrl } from "@/lib/profile";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileTabBar } from "./MobileTabBar";

export async function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const viewer = await getViewer();
  const nav = [
    { href: `/${locale}/services`, label: dict.market.servicesTitle },
    { href: `/${locale}/projects`, label: dict.market.projectsTitle },
    { href: `/${locale}/jobs`, label: dict.nav.jobs },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 border-b border-ink px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo href={`/${locale}`} />
            <nav aria-label={dict.nav.primary} className="hidden md:block">
              <ul className="flex items-center gap-6 text-[0.95rem] text-ink">
                {nav.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="rounded-sm underline-offset-[6px] hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher locale={locale} label={dict.common.language} />
            {viewer ? (
              <UserMenu
                locale={locale}
                name={viewer.profile.display_name || viewer.user.email || ""}
                avatar={avatarUrl(viewer.profile.avatar_path)}
                isStaff={viewer.isStaff}
                labels={{
                  account: dict.nav.account,
                  dashboard: dict.nav.dashboard,
                  settings: dict.nav.settings,
                  admin: dict.nav.admin,
                  signOut: dict.nav.signOut,
                }}
              />
            ) : (
              <>
                <Link href={`/${locale}/sign-in`} className="hidden px-2 text-[0.95rem] underline-offset-[6px] hover:underline md:inline">
                  {dict.nav.signIn}
                </Link>
                <ButtonLink href={`/${locale}/sign-up`} variant="dark" size="sm" className="max-w-44 truncate sm:max-w-none">
                  {dict.nav.join}
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileTabBar
        label={dict.nav.primary}
        tabs={[
          { href: `/${locale}`, label: dict.nav.home, icon: "home", exact: true },
          { href: `/${locale}/search`, label: dict.nav.search, icon: "search" },
          { href: `/${locale}/services`, label: dict.market.servicesTitle, icon: "services" },
          { href: `/${locale}/projects`, label: dict.market.projectsTitle, icon: "jobs" },
          viewer
            ? { href: `/${locale}/dashboard`, label: dict.nav.dashboard, icon: "account" }
            : { href: `/${locale}/sign-in`, label: dict.nav.signIn, icon: "account" },
        ]}
      />
    </>
  );
}
