"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Search, UserRound } from "lucide-react";

type Tab = { href: string; label: string; icon: "home" | "search" | "jobs" | "account"; exact?: boolean };
const ICONS = { home: Home, search: Search, jobs: Briefcase, account: UserRound } as const;

/** Bottom navigation on phones: the main destinations stay within thumb reach. */
export function MobileTabBar({ label, tabs }: { label: string; tabs: Tab[] }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon];
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-[3px] text-xs ${
                  active ? "border-brand-600 font-bold text-ink" : "border-transparent text-ink-subtle"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" strokeWidth={active ? 2.4 : 1.8} />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
