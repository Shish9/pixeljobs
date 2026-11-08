import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { moderateAction } from "@/lib/actions/trust";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Card";

/** Staff area frame: heading + tabs. Pages call requireStaff() themselves (non-staff get a 404). */
export function AdminShell({ locale, dict, current, children }: { locale: Locale; dict: Dictionary; current: string; children: ReactNode }) {
  const tr = dict.trust;
  const tabs = [
    { href: "", label: tr.tabOverview },
    { href: "/reports", label: tr.tabQueue },
    { href: "/users", label: tr.tabUsers },
    { href: "/log", label: tr.tabLog },
  ];
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-h1 font-extrabold tracking-tight rtl:tracking-normal">{tr.modTitle}</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-muted">{tr.modIntro}</p>
      <nav aria-label={tr.modTitle} className="-mx-4 mt-6 overflow-x-auto border-b border-ink px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-6">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link href={`/${locale}/admin${t.href}`} aria-current={current === t.href ? "page" : undefined}
                className={cn("inline-flex min-h-12 items-center border-b-[3px]", current === t.href ? "border-brand-600 font-bold" : "border-transparent text-ink-subtle hover:text-ink")}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8">{children}</div>
    </Container>
  );
}

/** One form, several decision buttons (the clicked button's name/value is submitted). */
export function ModerationForm({
  locale,
  dict,
  targetType,
  targetId,
  reportId,
  actions,
  withNote = true,
}: {
  locale: Locale;
  dict: Dictionary;
  targetType: string;
  targetId: string;
  reportId?: string;
  actions: { action: string; tone: "danger" | "secondary" | "primary" }[];
  withNote?: boolean;
}) {
  const tr = dict.trust;
  const noteId = `note-${reportId ?? targetId}`;
  const tone = {
    danger: "bg-danger-700 text-white hover:bg-[#912018]",
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-ink hover:bg-sunken",
  };
  return (
    <form action={moderateAction} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      {reportId && <input type="hidden" name="reportId" value={reportId} />}
      {withNote && (
        <div>
          <label htmlFor={noteId} className="text-sm font-semibold">{tr.modNote}</label>
          <input id={noteId} name="note" maxLength={1000} className="mt-1 h-10 w-full rounded-md border border-[#bdb4a3] bg-surface px-3 text-sm" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button key={a.action} type="submit" name="action" value={a.action}
            className={cn("inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold", tone[a.tone])}>
            {(tr as Record<string, string>)[`act_${a.action}`] ?? a.action}
          </button>
        ))}
      </div>
    </form>
  );
}
