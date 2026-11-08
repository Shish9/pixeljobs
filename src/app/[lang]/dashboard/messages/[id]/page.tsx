import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate, translate } from "@/i18n/translate";
import { requireOnboardedViewer } from "@/lib/auth";
import { isUuid } from "@/lib/market";
import { getThread, markRead } from "@/lib/trust";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/Alert";
import { Container } from "@/components/ui/Card";
import { DashboardNav, Person, StatusBadge, statusTone } from "@/components/market/parts";
import { AutoRefresh, Composer, ReportButton } from "@/components/trust/TrustForms";
import { pickTrustMessages } from "@/components/trust/messages";
import { unreadCount } from "@/lib/trust";

export const metadata: Metadata = { robots: { index: false } };

export default async function ThreadPage({ params }: PageProps<"/[lang]/dashboard/messages/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !isUuid(id)) notFound();
  const viewer = await requireOnboardedViewer(lang, `/${lang}/dashboard/messages/${id}`);
  const [dict, fmt, thread] = await Promise.all([getDictionary(lang), getFormatters(lang), getThread(id, viewer.user.id, lang)]);
  if (!thread) notFound();
  await markRead(id);
  const unread = await unreadCount();
  const tr = dict.trust;
  const tm = pickTrustMessages(dict);
  const name = thread.other?.display_name || (thread.otherRole === "client" ? tr.clientLabel : tr.freelancerLabel);
  const ctx = thread.context;
  const when = (d: string) => fmt.date(d, { dateStyle: "medium", timeStyle: "short" });
  const statusKey = ctx ? (ctx.kind === "request" ? `market.rstatus_${ctx.status}` : `market.prstatus_${ctx.status}`) : "";

  return (
    <Container className="py-8 sm:py-12">
      <DashboardNav locale={lang} dict={dict} current="/messages" isFreelancer={viewer.profile.is_freelancer} isClient={viewer.profile.is_client} unread={unread} />
      <AutoRefresh seconds={10} />
      <div className="mx-auto mt-6 max-w-3xl">
        <Link href={`/${lang}/dashboard/messages`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> {tr.allMessages}
        </Link>

        <header className="mt-2 flex flex-wrap items-center gap-4 border-b border-ink pb-5">
          <Person person={thread.other} fallback={name} size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 font-extrabold">
              {thread.other?.username ? <Link href={`/${lang}/u/${thread.other.username}`} className="hover:text-brand-600">{name}</Link> : name}
            </h1>
            {ctx && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <Link href={ctx.href} className="underline underline-offset-4 hover:text-ink" dir="auto">
                  {interpolate(ctx.kind === "request" ? tr.aboutRequest : tr.aboutProposal, { title: ctx.title })}
                </Link>
                <StatusBadge tone={statusTone(ctx.status)}>{translate(dict, statusKey)}</StatusBadge>
              </p>
            )}
          </div>
        </header>

        <p className="mt-4 text-sm text-ink-subtle">{tr.privacyNote} {tr.payNote}</p>

        <section aria-label={tr.navMessages} className="mt-6">
          {thread.messages.length === 0 ? (
            <p className="py-6 text-ink-muted">{tr.noMessagesYet}</p>
          ) : (
            <ol className="space-y-4">
              {thread.messages.map((msg, i) => {
                const mine = msg.sender_id === viewer.user.id;
                const last = i === thread.messages.length - 1;
                return (
                  <li key={msg.id} id={last ? "latest" : undefined} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[85%] rounded-md px-4 py-3", mine ? "bg-brand-50" : "border border-line bg-paper", msg.hidden_at && "italic text-ink-subtle")}>
                      <p className="sr-only">{mine ? tr.you : name}</p>
                      <p className="whitespace-pre-line break-words" dir="auto">{msg.hidden_at ? tr.messageHidden : msg.body}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-subtle">
                      <time dateTime={msg.created_at}>{when(msg.created_at)}</time>
                      {!mine && !msg.hidden_at && <ReportButton locale={lang} m={tm} targetType="message" targetId={msg.id} compact />}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div id="composer" className="mt-8 border-t border-ink pt-6">
          {thread.blocked === "closed" && <Alert>{tr.threadClosed}</Alert>}
          {thread.blocked === "awaitingClient" && <Alert>{tr.awaitingClient}</Alert>}
          {thread.blocked === null && <Composer locale={lang} m={tm} conversationId={id} />}
          <p className="mt-3 text-xs text-ink-subtle">{tr.autoRefresh}</p>
        </div>
      </div>
    </Container>
  );
}
