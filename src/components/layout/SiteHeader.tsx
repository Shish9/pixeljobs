import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { getViewer } from "@/lib/auth";
import { avatarUrl } from "@/lib/profile";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";

export async function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const viewer = await getViewer();
  const nav = [
    { href: `/${locale}#how-it-works`, label: dict.nav.howItWorks },
    { href: `/${locale}/jobs`, label: dict.nav.jobs },
  ];
  const mobileLinks = viewer
    ? [...nav, { href: `/${locale}/dashboard`, label: dict.nav.dashboard }, { href: `/${locale}/settings`, label: dict.nav.settings }]
    : [...nav, { href: `/${locale}/sign-in`, label: dict.nav.signIn }, { href: `/${locale}/sign-up`, label: dict.nav.signUp }];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo href={`/${locale}`} />
          <nav aria-label={dict.nav.primary} className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm font-medium text-ink-muted">
              {nav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="rounded-sm hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
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
            <div className="hidden items-center gap-2 md:flex">
              <ButtonLink href={`/${locale}/sign-in`} variant="ghost" size="sm">
                {dict.nav.signIn}
              </ButtonLink>
              <ButtonLink href={`/${locale}/sign-up`} variant="dark" size="sm">
                {dict.nav.signUp}
              </ButtonLink>
            </div>
          )}
          <MobileNav label={dict.common.menu} closeLabel={dict.common.close} links={mobileLinks} />
        </div>
      </div>
    </header>
  );
}
