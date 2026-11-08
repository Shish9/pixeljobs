import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { requireStaff } from "@/lib/auth";
import { staffUserList } from "@/lib/trust";
import { Badge, EmptyState } from "@/components/ui/Card";
import { AdminShell, ModerationForm } from "@/components/admin/AdminShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminUsersPage({ params, searchParams }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireStaff(lang);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const [dict, fmt, users] = await Promise.all([getDictionary(lang), getFormatters(lang), staffUserList(q)]);
  const tr = dict.trust;
  const a = dict.admin;
  const statusLabel = { active: a.statusActive, suspended: a.statusSuspended, deactivated: a.statusDeactivated } as const;

  return (
    <AdminShell locale={lang} dict={dict} current="/users">
      <form role="search" className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">{tr.searchUsers}</label>
        <input id="q" name="q" defaultValue={q} placeholder={tr.searchUsers} className="h-11 flex-1 rounded-md border border-[#bdb4a3] bg-surface px-3" />
        <button type="submit" className="h-11 rounded-md bg-ink px-4 font-semibold text-white">{tr.search}</button>
      </form>
      {users.length === 0 ? (
        <EmptyState title={tr.usersEmpty} />
      ) : (
        <ul className="border-t border-ink">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line py-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {u.username ? <Link href={`/${lang}/u/${u.username}`} className="hover:text-brand-600">{u.display_name || `@${u.username}`}</Link> : u.display_name || "—"}
                </p>
                <p className="text-sm text-ink-subtle">
                  {u.username && <span className="ltr-isolate">@{u.username} · </span>}
                  {[u.is_freelancer && dict.nav.freelancerMode, u.is_client && dict.nav.clientMode].filter(Boolean).join(" · ")}
                  {" · "}{fmt.date(u.created_at)}
                </p>
              </div>
              <Badge tone={u.account_status === "active" ? "success" : "danger"}>{statusLabel[u.account_status]}</Badge>
              {u.id !== viewer.user.id && u.account_status !== "deactivated" && (
                <ModerationForm locale={lang} dict={dict} targetType="user" targetId={u.id} withNote={false}
                  actions={[u.account_status === "suspended" ? { action: "reinstate", tone: "primary" } : { action: "suspend", tone: "danger" }]} />
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
