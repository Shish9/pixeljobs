import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { moderationCounts } from "@/lib/trust";
import { Badge, Card } from "@/components/ui/Card";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireStaff(lang);
  const [dict, fmt] = await Promise.all([getDictionary(lang), getFormatters(lang)]);
  const a = dict.admin;
  const supabase = (await createClient())!;

  // Staff RLS policy allows reading all profiles; counts use HEAD requests (no rows transferred).
  const [total, freelancers, clients, recent, mod] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_freelancer", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_client", true),
    supabase
      .from("profiles")
      .select("id, display_name, username, is_freelancer, is_client, account_status, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    moderationCounts(),
  ]);

  const metrics = [
    { label: a.metricUsers, value: total.count ?? 0 },
    { label: a.metricFreelancers, value: freelancers.count ?? 0 },
    { label: a.metricClients, value: clients.count ?? 0 },
    { label: dict.trust.statOpen, value: mod.open },
    { label: dict.trust.statReviewing, value: mod.reviewing },
    { label: dict.trust.statSuspended, value: mod.suspendedUsers },
    { label: dict.trust.statActions, value: mod.actions7d },
  ];
  const statusLabel = { active: a.statusActive, suspended: a.statusSuspended, deactivated: a.statusDeactivated } as const;

  return (
    <AdminShell locale={lang} dict={dict} current="">
      <section aria-labelledby="metrics">
        <h2 id="metrics" className="sr-only">{a.metricsTitle}</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((mt) => (
            <Card key={mt.label} className="p-5">
              <dt className="text-sm text-ink-muted">{mt.label}</dt>
              <dd className="mt-1 text-3xl font-extrabold">{fmt.number(mt.value)}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="users" className="mt-10">
        <h2 id="users" className="text-lg font-bold">{a.usersTitle}</h2>
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-sunken/60 text-start text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{a.colName}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{a.colUsername}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{a.colModes}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{a.colStatus}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{a.colJoined}</th>
              </tr>
            </thead>
            <tbody>
              {(recent.data ?? []).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{u.display_name || "—"}</td>
                  <td className="ltr-isolate px-4 py-3 text-ink-muted">{u.username ? `@${u.username}` : "—"}</td>
                  <td className="space-x-1 px-4 py-3 rtl:space-x-reverse">
                    {u.is_freelancer && <Badge tone="brand">{dict.nav.freelancerMode}</Badge>}
                    {u.is_client && <Badge>{dict.nav.clientMode}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.account_status === "active" ? "success" : "danger"}>{statusLabel[u.account_status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{fmt.date(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </AdminShell>
  );
}
