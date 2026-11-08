import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { inbox } from "@/lib/trust";
import { EmptyState } from "@/components/ui/Card";
import { DashShell } from "@/components/market/DashShell";
import { Person } from "@/components/market/parts";
import { AutoRefresh } from "@/components/trust/TrustForms";

export const metadata: Metadata = { robots: { index: false } };

export default async function MessagesPage({ params }: PageProps<"/[lang]/dashboard/messages">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/messages`);
  const [dict, fmt, rows] = await Promise.all([getDictionary(lang), getFormatters(lang), inbox(viewer.user.id, lang)]);
  const tr = dict.trust;
  return (
    <DashShell locale={lang} dict={dict} viewer={viewer} current="/messages" title={tr.navMessages} intro={tr.inboxIntro}>
      <AutoRefresh seconds={30} />
      {rows.length === 0 ? (
        <EmptyState title={tr.inboxEmpty} body={tr.inboxEmptyBody} />
      ) : (
        <ul className="border-t border-ink">
          {rows.map((c) => {
            const name = c.other?.display_name || (c.otherRole === "client" ? tr.clientLabel : tr.freelancerLabel);
            const about = c.context ? interpolate(c.context.kind === "request" ? tr.aboutRequest : tr.aboutProposal, { title: c.context.title }) : "";
            const mine = c.last_sender_id === viewer.user.id;
            return (
              <li key={c.id} className="border-b border-line">
                <Link href={`/${lang}/dashboard/messages/${c.id}#latest`} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-4 hover:bg-sunken/60 sm:px-2">
                  <Person person={c.other} fallback={name} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={c.unread ? "font-extrabold" : "font-semibold"}>{name}</span>
                      {c.unread && <span className="rounded-full bg-brand-600 px-2 text-xs leading-5 font-bold text-white">{tr.unread}</span>}
                    </span>
                    <span className="block truncate text-sm text-ink-subtle" dir="auto">{about}</span>
                    <span className={`mt-1 block truncate ${c.unread ? "text-ink" : "text-ink-muted"}`} dir="auto">
                      {mine && <span className="text-ink-subtle">{tr.you}: </span>}
                      {c.last_message_preview || tr.messageHidden}
                    </span>
                  </span>
                  <time dateTime={c.last_message_at ?? undefined} className="text-sm whitespace-nowrap text-ink-subtle">
                    {c.last_message_at ? fmt.date(c.last_message_at) : ""}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashShell>
  );
}
