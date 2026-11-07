"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { getViewer } from "@/lib/auth";
import { dbErrorKey } from "@/lib/db-errors";
import { removeMedia, uploadMedia } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_PROPOSAL_ACTIONS,
  CLIENT_REQUEST_ACTIONS,
  FREELANCER_REQUEST_ACTIONS,
  PROJECT_TRANSITIONS,
  TIERS,
  isOneOf,
  type ProjectStatus,
  type ProposalStatus,
  type RequestStatus,
} from "@/lib/taxonomy";
import {
  entrySchema,
  faqSchema,
  fieldErrors,
  packageSchema,
  portfolioSchema,
  profileDetailsSchema,
  projectSchema,
  proposalSchema,
  requestSchema,
  serviceSchema,
} from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(value) ? value : defaultLocale;
}

function idFrom(formData: FormData, key = "id"): string | null {
  const v = formData.get(key);
  return typeof v === "string" && UUID.test(v) ? v : null;
}

/** Signed-in, active member + per-request Supabase client. Database RLS remains the final authority. */
async function ctx() {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  if (!viewer || !supabase || viewer.profile.account_status !== "active") return null;
  return { viewer, supabase, userId: viewer.user.id };
}

const forbidden: ActionState = { status: "error", message: "errors.forbidden" };

/**
 * Echo submitted text back to the form. React resets a form after its action runs, so forms use these values as
 * their defaults — nobody loses what they typed when validation fails. Multi-value fields are comma-joined.
 */
function echo(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$") || key === "locale") continue;
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    if (all.length) out[key] = all.join(",");
  }
  return out;
}
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

// ---------------------------------------------------------------------------------------------------------------
// Profile details + entries
// ---------------------------------------------------------------------------------------------------------------

export async function updateProfileDetailsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const parsed = profileDetailsSchema.safeParse({
    skills: str(fd, "skills"),
    languages: fd.getAll("languages"),
    availability: str(fd, "availability"),
    rate: str(fd, "rate"),
    websiteUrl: str(fd, "websiteUrl"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { error } = await c.supabase
    .from("profiles")
    .update({
      skills: parsed.data.skills,
      languages: parsed.data.languages,
      availability: parsed.data.availability,
      rate_minor: parsed.data.rate,
      rate_currency: "IQD",
      website_url: parsed.data.websiteUrl,
    })
    .eq("id", c.userId);
  if (error) return { status: "error", message: dbErrorKey(error), values };
  revalidatePath(`/${localeFrom(fd)}`, "layout");
  return { status: "success", message: "common.saved", values };
}

export async function addEntryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const parsed = entrySchema.safeParse({
    kind: str(fd, "kind"),
    title: str(fd, "title"),
    organization: str(fd, "organization"),
    startYear: str(fd, "startYear"),
    endYear: str(fd, "endYear"),
    description: str(fd, "description"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const { error } = await c.supabase.from("profile_entries").insert({
    kind: d.kind, title: d.title, organization: d.organization, start_year: d.startYear, end_year: d.endYear, description: d.description,
  });
  if (error) return { status: "error", message: dbErrorKey(error), values };
  revalidatePath(`/${localeFrom(fd)}/dashboard/profile`);
  return { status: "success", message: "common.saved" };
}

export async function deleteEntryAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  if (!c || !id) return;
  await c.supabase.from("profile_entries").delete().eq("id", id).eq("user_id", c.userId);
  revalidatePath(`/${localeFrom(fd)}/dashboard/profile`);
}

// ---------------------------------------------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------------------------------------------

export async function addPortfolioAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const parsed = portfolioSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    linkUrl: str(fd, "linkUrl"),
    skills: str(fd, "skills"),
    outcome: str(fd, "outcome"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const upload = await uploadMedia(c.supabase, c.userId, fd.get("image"));
  if (upload && !upload.ok) return { status: "error", fieldErrors: { image: upload.error }, values };
  const d = parsed.data;
  const { error } = await c.supabase.from("portfolio_items").insert({
    title: d.title, description: d.description, link_url: d.linkUrl, skills: d.skills, outcome: d.outcome,
    image_path: upload?.ok ? upload.path : null,
  });
  if (error) {
    if (upload?.ok) await removeMedia(c.supabase, c.userId, upload.path);
    return { status: "error", message: dbErrorKey(error), values };
  }
  revalidatePath(`/${localeFrom(fd)}`, "layout");
  return { status: "success", message: "common.saved" };
}

export async function deletePortfolioAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  if (!c || !id) return;
  const { data } = await c.supabase.from("portfolio_items").delete().eq("id", id).eq("owner_id", c.userId).select("image_path").maybeSingle();
  await removeMedia(c.supabase, c.userId, data?.image_path);
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}

// ---------------------------------------------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------------------------------------------

/** Creates or updates a service with its packages and FAQs; `intent=publish` publishes after saving. */
export async function saveServiceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const locale = localeFrom(fd);
  const existingId = idFrom(fd);
  const intent = str(fd, "intent") === "publish" ? "publish" : "draft";

  const parsed = serviceSchema.safeParse({
    title: str(fd, "title"),
    category: str(fd, "category"),
    description: str(fd, "description") ?? "",
    requirements: str(fd, "requirements"),
    city: str(fd, "city") ?? "",
    languages: fd.getAll("languages"),
  });
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  // Packages: a tier is included when any of its fields is filled. Basic is required to publish.
  const packages: { tier: (typeof TIERS)[number]; title: string; description: string | null; price: number; deliveryDays: number; revisions: number; deliverables: string[] }[] = [];
  const dropTiers: (typeof TIERS)[number][] = [];
  for (const tier of TIERS) {
    const raw = {
      tier,
      title: str(fd, `${tier}_title`) ?? "",
      description: str(fd, `${tier}_description`),
      price: str(fd, `${tier}_price`) ?? "",
      deliveryDays: str(fd, `${tier}_deliveryDays`) ?? "",
      revisions: str(fd, `${tier}_revisions`) || "1",
      deliverables: str(fd, `${tier}_deliverables`),
    };
    const touched = [raw.title, raw.price, raw.deliveryDays, raw.description ?? "", raw.deliverables ?? ""].some((v) => v.trim() !== "");
    if (!touched) {
      dropTiers.push(tier);
      continue;
    }
    const p = packageSchema.safeParse(raw);
    if (!p.success) {
      for (const [k, v] of Object.entries(fieldErrors(p.error))) errors[`${tier}_${k}`] = v;
    } else {
      packages.push(p.data);
    }
  }
  if (intent === "publish" && !packages.some((p) => p.tier === "basic") && !errors.basic_title) errors.basic_title = "errors.packageRequired";

  const faqs = faqSchema.safeParse([0, 1, 2].map((i) => ({ q: str(fd, `faq_q_${i}`) ?? "", a: str(fd, `faq_a_${i}`) ?? "" })));
  if (Object.keys(errors).length > 0 || !parsed.success) return { status: "error", fieldErrors: errors, values };

  const upload = await uploadMedia(c.supabase, c.userId, fd.get("cover"));
  if (upload && !upload.ok) return { status: "error", fieldErrors: { cover: upload.error }, values };

  const d = parsed.data;
  const fields = {
    title: d.title, category: d.category, description: d.description, requirements: d.requirements, city: d.city,
    languages: d.languages, faqs: faqs.success ? faqs.data : [],
    ...(upload?.ok ? { cover_path: upload.path } : {}),
  };

  let serviceId = existingId;
  let previousCover: string | null = null;
  if (serviceId) {
    const { data: before } = await c.supabase.from("services").select("cover_path").eq("id", serviceId).eq("owner_id", c.userId).maybeSingle();
    if (!before) return forbidden;
    previousCover = before.cover_path;
    const { error } = await c.supabase.from("services").update(fields).eq("id", serviceId).eq("owner_id", c.userId);
    if (error) return { status: "error", message: dbErrorKey(error), values };
  } else {
    const { data, error } = await c.supabase.from("services").insert(fields).select("id").single();
    if (error || !data) return { status: "error", message: dbErrorKey(error), values };
    serviceId = data.id;
  }

  if (packages.length) {
    const { error } = await c.supabase.from("service_packages").upsert(
      packages.map((p) => ({
        service_id: serviceId!, tier: p.tier, title: p.title, description: p.description, price_minor: p.price,
        currency: "IQD", delivery_days: p.deliveryDays, revisions: p.revisions, deliverables: p.deliverables,
      })),
    );
    if (error) return { status: "error", message: dbErrorKey(error), values };
  }
  if (dropTiers.length) await c.supabase.from("service_packages").delete().eq("service_id", serviceId!).in("tier", dropTiers);
  if (upload?.ok && previousCover) await removeMedia(c.supabase, c.userId, previousCover);

  if (intent === "publish") {
    const { error } = await c.supabase.from("services").update({ status: "published" }).eq("id", serviceId!);
    if (error) {
      revalidatePath(`/${locale}/dashboard/services`);
      return { status: "error", message: dbErrorKey(error), values };
    }
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/dashboard/services/${serviceId}?saved=${intent}`);
}

export async function setServiceStatusAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  const status = str(fd, "status");
  if (!c || !id || !isOneOf(["published", "archived", "draft"] as const, status)) return;
  await c.supabase.from("services").update({ status }).eq("id", id).eq("owner_id", c.userId);
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}

export async function deleteServiceAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  if (!c || !id) return;
  const { data } = await c.supabase.from("services").delete().eq("id", id).eq("owner_id", c.userId).eq("status", "draft").select("cover_path").maybeSingle();
  await removeMedia(c.supabase, c.userId, data?.cover_path);
  const locale = localeFrom(fd);
  revalidatePath(`/${locale}/dashboard/services`);
  redirect(`/${locale}/dashboard/services`);
}

// ---------------------------------------------------------------------------------------------------------------
// Service requests
// ---------------------------------------------------------------------------------------------------------------

export async function requestServiceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const parsed = requestSchema.safeParse({ serviceId: str(fd, "serviceId"), tier: str(fd, "tier"), message: str(fd, "message") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { error } = await c.supabase.from("service_requests").insert({
    service_id: parsed.data.serviceId, tier: parsed.data.tier, message: parsed.data.message,
  });
  if (error) return { status: "error", message: dbErrorKey(error), values };
  revalidatePath(`/${localeFrom(fd)}/dashboard/requests`);
  return { status: "success", message: "market.requestSent", values };
}

export async function updateRequestStatusAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  const status = str(fd, "status");
  if (!c || !id || !status) return;
  const { data: req } = await c.supabase.from("service_requests").select("status, client_id, freelancer_id").eq("id", id).maybeSingle();
  if (!req) return;
  const allowed: RequestStatus[] =
    req.freelancer_id === c.userId ? FREELANCER_REQUEST_ACTIONS[req.status] : req.client_id === c.userId ? CLIENT_REQUEST_ACTIONS[req.status] : [];
  if (!isOneOf(allowed, status)) return;
  await c.supabase.from("service_requests").update({ status }).eq("id", id);
  revalidatePath(`/${localeFrom(fd)}/dashboard`, "layout");
}

// ---------------------------------------------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------------------------------------------

export async function saveProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const locale = localeFrom(fd);
  const existingId = idFrom(fd);
  const intent = str(fd, "intent") === "open" ? "open" : "draft";
  const parsed = projectSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    skills: str(fd, "skills"),
    budgetType: str(fd, "budgetType"),
    budgetMin: str(fd, "budgetMin"),
    budgetMax: str(fd, "budgetMax"),
    timeline: str(fd, "timeline"),
    experienceLevel: str(fd, "experienceLevel"),
    city: str(fd, "city") ?? "",
    visibility: str(fd, "visibility"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const fields = {
    title: d.title, description: d.description, category: d.category, skills: d.skills, budget_type: d.budgetType,
    budget_min_minor: d.budgetMin, budget_max_minor: d.budgetMax, timeline: d.timeline, experience_level: d.experienceLevel,
    city: d.city, visibility: d.visibility,
  };

  let projectId = existingId;
  if (projectId) {
    const { data: before } = await c.supabase.from("projects").select("status").eq("id", projectId).eq("client_id", c.userId).maybeSingle();
    if (!before) return forbidden;
    const nextStatus = intent === "open" && before.status === "draft" ? { status: "open" as const } : {};
    const { error } = await c.supabase.from("projects").update({ ...fields, ...nextStatus }).eq("id", projectId);
    if (error) return { status: "error", message: dbErrorKey(error), values };
  } else {
    const { data, error } = await c.supabase.from("projects").insert({ ...fields, status: intent }).select("id").single();
    if (error || !data) return { status: "error", message: dbErrorKey(error), values };
    projectId = data.id;
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/dashboard/projects/${projectId}?saved=${intent}`);
}

export async function setProjectStatusAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  const status = str(fd, "status");
  if (!c || !id || !status) return;
  const { data: p } = await c.supabase.from("projects").select("status").eq("id", id).eq("client_id", c.userId).maybeSingle();
  if (!p || !isOneOf(PROJECT_TRANSITIONS[p.status as ProjectStatus], status)) return;
  await c.supabase.from("projects").update({ status }).eq("id", id);
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}

export async function deleteProjectAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  if (!c || !id) return;
  await c.supabase.from("projects").delete().eq("id", id).eq("client_id", c.userId).eq("status", "draft");
  const locale = localeFrom(fd);
  revalidatePath(`/${locale}/dashboard/projects`);
  redirect(`/${locale}/dashboard/projects`);
}

// ---------------------------------------------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------------------------------------------

export async function sendProposalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await ctx();
  if (!c) return forbidden;
  const values = echo(fd);
  const parsed = proposalSchema.safeParse({
    projectId: str(fd, "projectId"),
    coverLetter: str(fd, "coverLetter") ?? "",
    bid: str(fd, "bid") ?? "",
    timelineDays: str(fd, "timelineDays") ?? "",
    portfolioItemIds: fd.getAll("portfolioItemIds"),
    answers: str(fd, "answers") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const { error } = await c.supabase.from("proposals").insert({
    project_id: d.projectId, cover_letter: d.coverLetter, bid_minor: d.bid, timeline_days: d.timelineDays,
    portfolio_item_ids: d.portfolioItemIds, answers: d.answers,
  });
  if (error) return { status: "error", message: error.code === "23505" ? "market.alreadyProposed" : dbErrorKey(error), values };
  revalidatePath(`/${localeFrom(fd)}`, "layout");
  return { status: "success", message: "market.proposalSent" };
}

export async function updateProposalStatusAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd);
  const status = str(fd, "status");
  if (!c || !id || !status) return;
  const { data: p } = await c.supabase.from("proposals").select("status, client_id, freelancer_id").eq("id", id).maybeSingle();
  if (!p) return;
  const allowed: ProposalStatus[] =
    p.client_id === c.userId
      ? CLIENT_PROPOSAL_ACTIONS[p.status]
      : p.freelancer_id === c.userId && (p.status === "submitted" || p.status === "shortlisted")
        ? ["withdrawn"]
        : [];
  if (!isOneOf(allowed, status)) return;
  await c.supabase.from("proposals").update({ status }).eq("id", id);
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}

// ---------------------------------------------------------------------------------------------------------------
// Saved items
// ---------------------------------------------------------------------------------------------------------------

export async function toggleSavedAction(fd: FormData): Promise<void> {
  const c = await ctx();
  const id = idFrom(fd, "itemId");
  const type = str(fd, "itemType");
  if (!c || !id || !isOneOf(["service", "project", "freelancer"] as const, type)) return;
  const saved = str(fd, "saved") === "1";
  if (saved) {
    await c.supabase.from("saved_items").delete().eq("user_id", c.userId).eq("item_type", type).eq("item_id", id);
  } else {
    await c.supabase.from("saved_items").insert({ item_type: type, item_id: id });
  }
  revalidatePath(`/${localeFrom(fd)}`, "layout");
}
