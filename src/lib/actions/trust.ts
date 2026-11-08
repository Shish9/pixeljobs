"use server";

import { revalidatePath } from "next/cache";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { getViewer } from "@/lib/auth";
import { dbErrorKey } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { MODERATION_ACTIONS, fieldErrors, messageSchema, reportSchema, reviewSchema } from "@/lib/validation";

/**
 * Messaging, reviews, reports and moderation. The database enforces every rule (participants only, completed work
 * only, staff only…); these actions validate input, call it as the signed-in user and map errors to messages.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const forbidden: ActionState = { status: "error", message: "errors.forbidden" };

function localeFrom(fd: FormData): Locale {
  const v = fd.get("locale");
  return isLocale(v) ? v : defaultLocale;
}
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

async function ctx() {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  if (!viewer || !supabase || viewer.profile.account_status !== "active") return null;
  return { viewer, supabase, userId: viewer.user.id };
}

export async function sendMessageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const body = str(fd, "body") ?? "";
  const parsed = messageSchema.safeParse({ conversationId: str(fd, "conversationId"), body });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { body } };
  const { error } = await c.supabase.from("messages").insert({ conversation_id: parsed.data.conversationId, body: parsed.data.body });
  if (error) return { status: "error", message: dbErrorKey(error), values: { body } };
  revalidatePath(`/${localeFrom(fd)}/dashboard/messages`, "layout");
  return { status: "success" };
}

export async function submitReviewAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = { rating: str(fd, "rating") ?? "", body: str(fd, "body") ?? "" };
  const parsed = reviewSchema.safeParse({
    requestId: str(fd, "requestId") || undefined,
    proposalId: str(fd, "proposalId") || undefined,
    rating: values.rating,
    body: values.body,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const { error } = await c.supabase.from("reviews").insert({
    request_id: d.requestId ?? null,
    proposal_id: d.proposalId ?? null,
    rating: d.rating,
    body: d.body || null,
  });
  if (error) return { status: "error", message: error.code === "23505" ? "trust.alreadyReviewed" : dbErrorKey(error), values };
  revalidatePath(`/${localeFrom(fd)}`, "layout");
  return { status: "success", message: "trust.reviewSaved" };
}

export async function reportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = { reason: str(fd, "reason") ?? "", details: str(fd, "details") ?? "" };
  const parsed = reportSchema.safeParse({
    targetType: str(fd, "targetType"),
    targetId: str(fd, "targetId"),
    reason: values.reason,
    details: values.details,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const { error } = await c.supabase.from("reports").insert({ target_type: d.targetType, target_id: d.targetId, reason: d.reason, details: d.details });
  // A second report on the same item is not an error for the reporter: it is already in the queue.
  if (error && error.code !== "23505") return { status: "error", message: dbErrorKey(error), values };
  return { status: "success", message: "trust.reportSent" };
}

export async function moderateAction(fd: FormData): Promise<void> {
  const c = await ctx();
  if (!c || !c.viewer.isStaff) return;
  const targetType = str(fd, "targetType") ?? "";
  const targetId = str(fd, "targetId") ?? "";
  const action = str(fd, "action") ?? "";
  const reportId = str(fd, "reportId");
  const note = (str(fd, "note") ?? "").trim().slice(0, 1000) || null;
  if (!UUID.test(targetId) || (reportId && !UUID.test(reportId))) return;
  const allowed =
    action === "dismiss" || action === "reviewing"
      ? Boolean(reportId)
      : (MODERATION_ACTIONS as Record<string, readonly string[]>)[targetType]?.includes(action) ?? false;
  if (!allowed) return;
  await c.supabase.rpc("moderate", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_action: action,
    p_note: note,
    p_report_id: reportId || null,
  });
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}
