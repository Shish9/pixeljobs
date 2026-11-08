import "server-only";
import type { ReportStatus, Tables } from "@/lib/database.types";
import { db, peopleById, type DB, type PublicPerson } from "@/lib/market";

/**
 * Phase 7 reads: conversations, reviews and the moderation queue. Everything runs as the current user, so RLS
 * decides visibility (staff cannot read conversations; the only message text they see is a report snapshot).
 */

export type ConversationContext = {
  kind: "request" | "proposal";
  title: string;
  href: string;
  status: string;
};

export type InboxRow = Tables<"conversations"> & {
  other: PublicPerson | null;
  otherRole: "client" | "freelancer";
  context: ConversationContext | null;
  unread: boolean;
};

async function contexts(supabase: DB, rows: Tables<"conversations">[], locale: string) {
  const requestIds = rows.flatMap((r) => (r.request_id ? [r.request_id] : []));
  const proposalIds = rows.flatMap((r) => (r.proposal_id ? [r.proposal_id] : []));
  const [{ data: requests }, { data: proposals }] = await Promise.all([
    requestIds.length
      ? supabase.from("service_requests").select("id, service_id, status").in("id", requestIds)
      : Promise.resolve({ data: [] as { id: string; service_id: string; status: string }[] }),
    proposalIds.length
      ? supabase.from("proposals").select("id, project_id, status").in("id", proposalIds)
      : Promise.resolve({ data: [] as { id: string; project_id: string; status: string }[] }),
  ]);
  const serviceIds = [...new Set((requests ?? []).map((r) => r.service_id))];
  const projectIds = [...new Set((proposals ?? []).map((p) => p.project_id))];
  const [{ data: services }, { data: projects }] = await Promise.all([
    serviceIds.length
      ? supabase.from("services").select("id, title").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    projectIds.length
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const serviceTitle = new Map((services ?? []).map((s) => [s.id, s.title]));
  const projectTitle = new Map((projects ?? []).map((p) => [p.id, p.title]));
  const out = new Map<string, ConversationContext>();
  for (const r of requests ?? []) {
    out.set(r.id, { kind: "request", title: serviceTitle.get(r.service_id) ?? "—", href: `/${locale}/dashboard/requests`, status: r.status });
  }
  for (const p of proposals ?? []) {
    out.set(p.id, { kind: "proposal", title: projectTitle.get(p.project_id) ?? "—", href: `/${locale}/projects/${p.project_id}`, status: p.status });
  }
  return out;
}

export async function inbox(userId: string, locale: string): Promise<InboxRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const otherId = (r: Tables<"conversations">) => (r.client_id === userId ? r.freelancer_id : r.client_id);
  const [people, ctx, { data: myReads }] = await Promise.all([
    peopleById(supabase, rows.map(otherId)),
    contexts(supabase, rows, locale),
    supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)
      .in("conversation_id", rows.map((r) => r.id)),
  ]);
  const readAt = new Map((myReads ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  return rows.map((r) => {
    const last = readAt.get(r.id);
    return {
      ...r,
      other: people.get(otherId(r)) ?? null,
      otherRole: r.client_id === userId ? "freelancer" : "client",
      context: ctx.get(r.request_id ?? r.proposal_id ?? "") ?? null,
      unread: r.last_sender_id !== userId && Boolean(r.last_message_at) && (!last || last < r.last_message_at!),
    };
  });
}

export type Thread = {
  conversation: Tables<"conversations">;
  messages: Tables<"messages">[];
  other: PublicPerson | null;
  otherRole: "client" | "freelancer";
  context: ConversationContext | null;
  /** null when the viewer may write; otherwise the reason key (mirrors the database rules). */
  blocked: null | "closed" | "awaitingClient";
};

const OPEN_REQUEST = ["pending", "accepted", "completed"];
const OPEN_PROPOSAL = ["submitted", "shortlisted", "accepted"];

export async function getThread(id: string, userId: string, locale: string): Promise<Thread | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data: conversation } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conversation) return null;
  const otherId = conversation.client_id === userId ? conversation.freelancer_id : conversation.client_id;
  const [{ data: messages }, people, ctx, { data: otherProfile }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(500),
    peopleById(supabase, [otherId]),
    contexts(supabase, [conversation], locale),
    supabase.from("profiles").select("account_status").eq("id", otherId).maybeSingle(),
  ]);
  const context = ctx.get(conversation.request_id ?? conversation.proposal_id ?? "") ?? null;
  const list = messages ?? [];
  let blocked: Thread["blocked"] = null;
  const open = context ? (context.kind === "request" ? OPEN_REQUEST : OPEN_PROPOSAL).includes(context.status) : false;
  if (!open || otherProfile?.account_status === "suspended") blocked = "closed";
  else if (
    context?.kind === "proposal" &&
    context.status === "submitted" &&
    userId === conversation.freelancer_id &&
    !list.some((m) => m.sender_id === conversation.client_id)
  ) {
    blocked = "awaitingClient";
  }
  return {
    conversation,
    messages: list,
    other: people.get(otherId) ?? null,
    otherRole: conversation.client_id === userId ? "freelancer" : "client",
    context,
    blocked,
  };
}

export async function markRead(conversationId: string) {
  const supabase = await db();
  if (!supabase) return;
  await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}

export async function unreadCount(): Promise<number> {
  const supabase = await db();
  if (!supabase) return 0;
  const { data } = await supabase.rpc("unread_conversation_count");
  return typeof data === "number" ? data : 0;
}

/** request/proposal id → conversation id, for "Message" links on the requests and proposals pages. */
export async function conversationLinks(kind: "request" | "proposal", ids: string[]): Promise<Map<string, string>> {
  const supabase = await db();
  if (!supabase || ids.length === 0) return new Map();
  const col = kind === "request" ? "request_id" : "proposal_id";
  const { data } = await supabase.from("conversations").select("id, request_id, proposal_id").in(col, ids);
  return new Map((data ?? []).map((c) => [(kind === "request" ? c.request_id : c.proposal_id) as string, c.id]));
}

// ---------------------------------------------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------------------------------------------

export type Rating = { count: number; avg: number };

export async function ratingsFor(userIds: string[]): Promise<Map<string, Rating>> {
  const supabase = await db();
  const ids = [...new Set(userIds)];
  if (!supabase || ids.length === 0) return new Map();
  const { data } = await supabase.from("review_stats").select("*").in("reviewee_id", ids);
  return new Map((data ?? []).map((r) => [r.reviewee_id, { count: r.review_count, avg: Number(r.rating_avg) }]));
}

export async function serviceRatings(serviceIds: string[]): Promise<Map<string, Rating>> {
  const supabase = await db();
  const ids = [...new Set(serviceIds)];
  if (!supabase || ids.length === 0) return new Map();
  const { data } = await supabase.from("service_review_stats").select("*").in("service_id", ids);
  return new Map((data ?? []).map((r) => [r.service_id, { count: r.review_count, avg: Number(r.rating_avg) }]));
}

export type PublicReview = Tables<"reviews"> & { reviewer: PublicPerson | null };

export async function reviewsAbout(filter: { reviewee?: string; service?: string }, limit = 20): Promise<PublicReview[]> {
  const supabase = await db();
  if (!supabase) return [];
  let q = supabase.from("reviews").select("*").eq("status", "published").lte("visible_at", new Date().toISOString());
  if (filter.reviewee) q = q.eq("reviewee_id", filter.reviewee);
  if (filter.service) q = q.eq("service_id", filter.service);
  const { data } = await q.order("created_at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const people = await peopleById(supabase, rows.map((r) => r.reviewer_id));
  return rows.map((r) => ({ ...r, reviewer: people.get(r.reviewer_id) ?? null }));
}

/** Engagement ids (request or proposal) the viewer has already reviewed. */
export async function myReviewedEngagements(userId: string): Promise<Set<string>> {
  const supabase = await db();
  if (!supabase) return new Set();
  const { data } = await supabase.from("reviews").select("request_id, proposal_id").eq("reviewer_id", userId);
  return new Set((data ?? []).map((r) => (r.request_id ?? r.proposal_id) as string));
}

// ---------------------------------------------------------------------------------------------------------------
// Moderation (staff pages; RLS returns nothing to non-staff)
// ---------------------------------------------------------------------------------------------------------------

export type QueueRow = Tables<"reports"> & { reporter: PublicPerson | null; owner: PublicPerson | null; ownerStatus: string | null; targetStatus: string | null };

export async function reportQueue(status: ReportStatus | "active"): Promise<QueueRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  let q = supabase.from("reports").select("*");
  q = status === "active" ? q.in("status", ["open", "reviewing"]) : q.eq("status", status);
  const { data } = await q.order("created_at", { ascending: status === "active" }).limit(100);
  const rows = data ?? [];
  const ownerIds = rows.flatMap((r) => (r.target_owner ? [r.target_owner] : []));
  const [people, { data: owners }, targetStatus] = await Promise.all([
    peopleById(supabase, [...rows.map((r) => r.reporter_id), ...ownerIds]),
    ownerIds.length
      ? supabase.from("profiles").select("id, account_status").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; account_status: string }[] }),
    targetStatuses(supabase, rows),
  ]);
  const ownerStatus = new Map((owners ?? []).map((o) => [o.id, o.account_status]));
  return rows.map((r) => ({
    ...r,
    reporter: people.get(r.reporter_id) ?? null,
    owner: r.target_owner ? people.get(r.target_owner) ?? null : null,
    ownerStatus: r.target_owner ? ownerStatus.get(r.target_owner) ?? null : null,
    targetStatus: targetStatus.get(`${r.target_type}:${r.target_id}`) ?? null,
  }));
}

/** Current moderation state of each reported item ("suspended", "hidden", "ok"…), so the queue offers restore. */
async function targetStatuses(supabase: DB, rows: Tables<"reports">[]) {
  const ids = (t: string) => [...new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const out = new Map<string, string>();
  const [services, portfolio, projects, reviews, users] = await Promise.all([
    ids("service").length ? supabase.from("services").select("id, status").in("id", ids("service")) : null,
    ids("portfolio").length ? supabase.from("portfolio_items").select("id, status").in("id", ids("portfolio")) : null,
    ids("project").length ? supabase.from("projects").select("id, moderation").in("id", ids("project")) : null,
    ids("review").length ? supabase.from("reviews").select("id, status").in("id", ids("review")) : null,
    ids("user").length ? supabase.from("profiles").select("id, account_status").in("id", ids("user")) : null,
  ]);
  for (const s of services?.data ?? []) out.set(`service:${s.id}`, s.status === "suspended" ? "suspended" : "ok");
  for (const s of portfolio?.data ?? []) out.set(`portfolio:${s.id}`, s.status === "suspended" ? "suspended" : "ok");
  for (const s of projects?.data ?? []) out.set(`project:${s.id}`, s.moderation === "suspended" ? "suspended" : "ok");
  for (const s of reviews?.data ?? []) out.set(`review:${s.id}`, s.status === "hidden" ? "hidden" : "ok");
  for (const s of users?.data ?? []) out.set(`user:${s.id}`, s.account_status === "suspended" ? "suspended" : "ok");
  return out;
}

export async function moderationLog(limit = 100) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("moderation_actions").select("*").order("created_at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const people = await peopleById(supabase, rows.flatMap((r) => (r.actor_id ? [r.actor_id] : [])));
  return rows.map((r) => ({ ...r, actor: r.actor_id ? people.get(r.actor_id) ?? null : null }));
}

export async function staffUserList(query: string, limit = 50) {
  const supabase = await db();
  if (!supabase) return [];
  let q = supabase.from("profiles").select("id, display_name, username, account_status, is_freelancer, is_client, created_at");
  const term = query.trim().replace(/[%_,()]/g, "");
  if (term) q = q.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
  const { data } = await q.order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function moderationCounts() {
  const supabase = await db();
  if (!supabase) return { open: 0, reviewing: 0, suspendedUsers: 0, actions7d: 0 };
  const head = { count: "exact" as const, head: true };
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [open, reviewing, suspended, actions] = await Promise.all([
    supabase.from("reports").select("id", head).eq("status", "open"),
    supabase.from("reports").select("id", head).eq("status", "reviewing"),
    supabase.from("profiles").select("id", head).eq("account_status", "suspended"),
    supabase.from("moderation_actions").select("id", head).gte("created_at", since),
  ]);
  return { open: open.count ?? 0, reviewing: reviewing.count ?? 0, suspendedUsers: suspended.count ?? 0, actions7d: actions.count ?? 0 };
}
