import Link from "next/link";
import { Bookmark, BookmarkCheck, Clock, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate, translate } from "@/i18n/translate";
import { toggleSavedAction } from "@/lib/actions/market";
import type { ProjectCard, ServiceCard } from "@/lib/market";
import { mediaUrl } from "@/lib/taxonomy";
import { avatarUrl } from "@/lib/profile";
import { cn } from "@/lib/cn";

type Fmt = { number: (n: number, o?: Intl.NumberFormatOptions) => string; date: (d: string) => string; money: (n: number, c: "IQD" | "USD") => string };

export function money(fmt: Fmt, amount: number, currency: string) {
  return fmt.money(amount, currency === "USD" ? "USD" : "IQD");
}

export function budgetLabel(dict: Dictionary, fmt: Fmt, p: Pick<ProjectCard, "budget_min_minor" | "budget_max_minor" | "currency">) {
  const m = dict.market;
  const min = p.budget_min_minor !== null ? money(fmt, p.budget_min_minor, p.currency) : null;
  const max = p.budget_max_minor !== null ? money(fmt, p.budget_max_minor, p.currency) : null;
  if (min && max) return interpolate(m.budgetRange, { min, max });
  if (min) return interpolate(m.budgetFrom, { min });
  if (max) return interpolate(m.budgetUpTo, { max });
  return m.budgetOpen;
}

const TONES = {
  neutral: "bg-sunken text-ink-muted",
  green: "bg-brand-50 text-brand-700",
  amber: "bg-accent-100 text-accent-800",
  red: "bg-danger-50 text-danger-700",
} as const;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-bold", TONES[tone])}>{children}</span>;
}

export function statusTone(status: string): keyof typeof TONES {
  if (["published", "open", "accepted", "completed", "shortlisted", "in_progress", "assigned"].includes(status)) return "green";
  if (["pending", "submitted", "in_review", "draft", "pending_review"].includes(status)) return "amber";
  if (["suspended", "rejected", "declined", "cancelled"].includes(status)) return "red";
  return "neutral";
}

export function Person({ person, fallback, size = "md" }: { person: { display_name: string; avatar_path: string | null } | null; fallback: string; size?: "sm" | "md" | "lg" }) {
  const name = person?.display_name || fallback;
  const src = avatarUrl(person?.avatar_path);
  const box = size === "lg" ? "size-20 text-2xl" : size === "sm" ? "size-7 text-xs" : "size-10 text-sm";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- user avatar from Supabase storage
    <img src={src} alt="" className={cn("shrink-0 rounded-full border border-line object-cover", box)} />
  ) : (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700", box)}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function ServiceTile({ service, locale, dict, fmt }: { service: ServiceCard; locale: Locale; dict: Dictionary; fmt: Fmt }) {
  const m = dict.market;
  const cover = mediaUrl(service.cover_path);
  return (
    <article className="group flex flex-col">
      <Link href={`/${locale}/services/${service.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-line bg-sunken">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- user upload from Supabase storage
            <img src={cover} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          ) : (
            <span className="absolute inset-0 grid place-items-center p-4 text-center text-lg font-bold text-ink-subtle">
              {translate(dict, `categories.${service.category}`)}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg leading-snug font-bold group-hover:text-brand-600">{service.title}</h3>
      </Link>
      <p className="mt-1 text-sm text-ink-subtle">
        {service.owner?.display_name ?? "—"}
        {service.city ? ` · ${translate(dict, `cities.${service.city}`)}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {service.fromPrice !== null && (
          <span className="bg-accent-200 px-1.5 py-0.5 font-extrabold">{interpolate(m.from, { price: money(fmt, service.fromPrice, service.currency) })}</span>
        )}
        {service.rating && service.rating.count > 0 && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="text-accent-600">★</span>
            <span aria-hidden="true" className="font-bold">{fmt.number(service.rating.avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <span aria-hidden="true" className="text-ink-subtle">({fmt.number(service.rating.count)})</span>
            <span className="sr-only">
              {interpolate(dict.trust.ratingOutOf, { avg: fmt.number(service.rating.avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}
            </span>
          </span>
        )}
        {service.fastestDays !== null && (
          <span className="inline-flex items-center gap-1 text-ink-subtle">
            <Clock className="size-3.5" aria-hidden="true" />
            {interpolate(m.deliveryIn, { days: fmt.number(service.fastestDays) })}
          </span>
        )}
      </div>
    </article>
  );
}

export function ProjectLine({
  project,
  locale,
  dict,
  fmt,
  href,
  extra,
}: {
  project: ProjectCard;
  locale: Locale;
  dict: Dictionary;
  fmt: Fmt;
  href?: string;
  extra?: ReactNode;
}) {
  return (
    <li className="border-b border-line">
      <div className="grid gap-2 py-5 md:grid-cols-[1fr_auto] md:gap-8">
        <div className="min-w-0">
          <Link href={href ?? `/${locale}/projects/${project.id}`} className="text-lg font-bold hover:text-brand-600">
            {project.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-subtle">
            <span>{translate(dict, `categories.${project.category}`)}</span>
            {project.city && (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{translate(dict, `cities.${project.city}`)}</span>
            )}
            {project.published_at && <span>{interpolate(dict.market.postedOn, { date: fmt.date(project.published_at) })}</span>}
          </p>
          {project.skills.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {project.skills.map((s) => <li key={s} className="bg-sunken px-2 py-0.5 text-xs">{s}</li>)}
            </ul>
          )}
        </div>
        <div className="md:text-end">
          <p className="font-extrabold">{budgetLabel(dict, fmt, project)}</p>
          <p className="text-sm text-ink-subtle">{translate(dict, `market.timeline_${project.timeline}`)}</p>
          {extra}
        </div>
      </div>
    </li>
  );
}

export function SaveButton({
  locale,
  itemType,
  itemId,
  saved,
  label,
  savedLabel,
}: {
  locale: string;
  itemType: "service" | "project" | "freelancer";
  itemId: string;
  saved: boolean;
  label: string;
  savedLabel: string;
}) {
  return (
    <form action={toggleSavedAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="saved" value={saved ? "1" : "0"} />
      <button
        type="submit"
        aria-pressed={saved}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
          saved ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink hover:bg-sunken",
        )}
      >
        {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
        {saved ? savedLabel : label}
      </button>
    </form>
  );
}

/** A small server form that posts one status change. */
export function StatusAction({
  action,
  locale,
  id,
  status,
  label,
  tone = "secondary",
}: {
  action: (fd: FormData) => Promise<void>;
  locale: string;
  id: string;
  status: string;
  label: string;
  tone?: "primary" | "secondary" | "danger";
}) {
  const cls = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-ink hover:bg-sunken",
    danger: "border border-danger-700 text-danger-700 hover:bg-danger-50",
  }[tone];
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={cn("inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold active:translate-y-px", cls)}>
        {label}
      </button>
    </form>
  );
}

export function DashboardNav({
  locale,
  dict,
  current,
  isFreelancer,
  isClient,
  unread = 0,
}: {
  locale: Locale;
  dict: Dictionary;
  current: string;
  isFreelancer: boolean;
  isClient: boolean;
  unread?: number;
}) {
  const m = dict.market;
  const links = [
    { href: "", label: m.navOverview, show: true },
    { href: "/messages", label: dict.trust.navMessages, show: true, badge: unread },
    { href: "/requests", label: m.navRequests, show: true },
    { href: "/services", label: m.navServices, show: isFreelancer },
    { href: "/proposals", label: m.navProposals, show: isFreelancer },
    { href: "/portfolio", label: m.navPortfolio, show: isFreelancer },
    { href: "/profile", label: m.navProfile, show: isFreelancer },
    { href: "/projects", label: m.navProjects, show: isClient },
    { href: "/saved", label: m.navSaved, show: true },
  ].filter((l) => l.show);
  return (
    <nav aria-label={m.dashNav} className="-mx-4 overflow-x-auto border-b border-ink px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-6">
        {links.map((l) => {
          const active = current === l.href;
          return (
            <li key={l.href}>
              <Link
                href={`/${locale}/dashboard${l.href}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center border-b-[3px] text-[0.95rem]",
                  active ? "border-brand-600 font-bold" : "border-transparent text-ink-subtle hover:text-ink",
                )}
              >
                {l.label}
                {"badge" in l && l.badge ? (
                  <span className="ms-1.5 inline-grid min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-xs leading-5 font-bold text-white">
                    <span aria-hidden="true">{l.badge}</span>
                    <span className="sr-only">{interpolate(dict.trust.unreadCount, { count: l.badge })}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageHead({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-h1 font-extrabold tracking-tight rtl:tracking-normal">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-lg text-ink-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}
