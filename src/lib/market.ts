import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { TIERS } from "@/lib/taxonomy";

/**
 * Marketplace reads. Every query runs as the current user, so RLS decides what is visible.
 * Related rows are fetched in one batched query per table (no per-row queries).
 */
export type DB = SupabaseClient<Database>;

export type PublicPerson = Pick<Tables<"profiles">, "id" | "display_name" | "username" | "avatar_path" | "city" | "headline" | "languages">;
const PERSON_COLUMNS = "id, display_name, username, avatar_path, city, headline, languages";

export type ServiceCard = Pick<
  Tables<"services">,
  "id" | "title" | "category" | "city" | "languages" | "cover_path" | "published_at" | "status" | "owner_id"
> & {
  owner: PublicPerson | null;
  fromPrice: number | null;
  currency: string;
  fastestDays: number | null;
  rating: { count: number; avg: number } | null;
};

export type ProjectCard = Pick<
  Tables<"projects">,
  | "id" | "title" | "category" | "city" | "skills" | "budget_type" | "budget_min_minor" | "budget_max_minor" | "currency"
  | "timeline" | "experience_level" | "status" | "published_at" | "created_at" | "client_id" | "description"
> & { client: PublicPerson | null };

export async function db(): Promise<DB | null> {
  return createClient();
}

export async function peopleById(supabase: DB, ids: string[]): Promise<Map<string, PublicPerson>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select(PERSON_COLUMNS).in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p as PublicPerson]));
}

async function decorateServices(supabase: DB, rows: Omit<ServiceCard, "owner" | "fromPrice" | "currency" | "fastestDays" | "rating">[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: packages }, people, { data: stats }] = await Promise.all([
    supabase.from("service_packages").select("service_id, price_minor, currency, delivery_days").in("service_id", ids),
    peopleById(supabase, rows.map((r) => r.owner_id)),
    supabase.from("service_review_stats").select("*").in("service_id", ids),
  ]);
  const ratings = new Map((stats ?? []).map((s) => [s.service_id, { count: s.review_count, avg: Number(s.rating_avg) }]));
  return rows.map((r): ServiceCard => {
    const own = (packages ?? []).filter((p) => p.service_id === r.id);
    const cheapest = own.reduce<(typeof own)[number] | null>((min, p) => (!min || p.price_minor < min.price_minor ? p : min), null);
    return {
      ...r,
      owner: people.get(r.owner_id) ?? null,
      fromPrice: cheapest?.price_minor ?? null,
      currency: cheapest?.currency ?? "IQD",
      fastestDays: own.length ? Math.min(...own.map((p) => p.delivery_days)) : null,
      rating: ratings.get(r.id) ?? null,
    };
  });
}

const SERVICE_CARD_COLUMNS = "id, title, category, city, languages, cover_path, published_at, status, owner_id";

export type ServiceFilters = { q?: string; category?: string; city?: string; lang?: string; maxPrice?: number | null };

export async function listServices(filters: ServiceFilters = {}, limit = 60): Promise<ServiceCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  let query = supabase.from("services").select(SERVICE_CARD_COLUMNS).eq("status", "published");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.lang) query = query.contains("languages", [filters.lang]);
  // websearch_to_tsquery handles free text safely (parameterised, no filter-string injection).
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[market] listServices", error.message);
    return [];
  }
  const cards = await decorateServices(supabase, data);
  return filters.maxPrice ? cards.filter((c) => c.fromPrice !== null && c.fromPrice <= filters.maxPrice!) : cards;
}

export const getService = cache(async (id: string) => {
  const supabase = await db();
  if (!supabase || !isUuid(id)) return null;
  const { data: service } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!service) return null;
  const [{ data: packages }, people] = await Promise.all([
    supabase.from("service_packages").select("*").eq("service_id", id),
    peopleById(supabase, [service.owner_id]),
  ]);
  const sorted = [...(packages ?? [])].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
  return { service, packages: sorted, owner: people.get(service.owner_id) ?? null };
});

const PROJECT_CARD_COLUMNS =
  "id, title, category, city, skills, budget_type, budget_min_minor, budget_max_minor, currency, timeline, experience_level, status, published_at, created_at, client_id, description";

export type ProjectFilters = { q?: string; category?: string; city?: string };

export async function listProjects(filters: ProjectFilters = {}, limit = 60): Promise<ProjectCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  let query = supabase.from("projects").select(PROJECT_CARD_COLUMNS).eq("status", "open");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[market] listProjects", error.message);
    return [];
  }
  const people = await peopleById(supabase, data.map((p) => p.client_id));
  return data.map((p) => ({ ...p, client: people.get(p.client_id) ?? null }));
}

export const getProject = cache(async (id: string) => {
  const supabase = await db();
  if (!supabase || !isUuid(id)) return null;
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) return null;
  const people = await peopleById(supabase, [project.client_id]);
  return { project, client: people.get(project.client_id) ?? null };
});

export async function getPublicProfile(username: string) {
  const supabase = await db();
  if (!supabase || !/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(username)) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!profile || !profile.onboarded_at) return null;
  const [{ data: entries }, { data: portfolio }, services] = await Promise.all([
    supabase.from("profile_entries").select("*").eq("user_id", profile.id).order("start_year", { ascending: false, nullsFirst: false }),
    supabase.from("portfolio_items").select("*").eq("owner_id", profile.id).eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("services").select(SERVICE_CARD_COLUMNS).eq("owner_id", profile.id).eq("status", "published").order("published_at", { ascending: false }),
  ]);
  return {
    profile,
    entries: entries ?? [],
    portfolio: portfolio ?? [],
    services: await decorateServices(supabase, services.data ?? []),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Dashboard reads (always scoped to the signed-in user by RLS and by explicit filters)
// ---------------------------------------------------------------------------------------------------------------

export async function myServices(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("services").select(SERVICE_CARD_COLUMNS).eq("owner_id", userId).order("updated_at", { ascending: false });
  return decorateServices(supabase, data ?? []);
}

export async function myPortfolio(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("portfolio_items").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function myEntries(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("profile_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function myProjects(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const [{ data: projects }, { data: proposals }] = await Promise.all([
    supabase.from("projects").select(PROJECT_CARD_COLUMNS).eq("client_id", userId).order("created_at", { ascending: false }),
    supabase.from("proposals").select("project_id, status").eq("client_id", userId),
  ]);
  return (projects ?? []).map((p) => ({
    ...p,
    client: null,
    proposalCount: (proposals ?? []).filter((x) => x.project_id === p.id && x.status !== "withdrawn").length,
  }));
}

export async function requestsFor(userId: string, side: "received" | "sent") {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq(side === "received" ? "freelancer_id" : "client_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  const [{ data: services }, people] = await Promise.all([
    rows.length
      ? supabase.from("services").select("id, title").in("id", [...new Set(rows.map((r) => r.service_id))])
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    peopleById(supabase, rows.map((r) => (side === "received" ? r.client_id : r.freelancer_id))),
  ]);
  const titles = new Map((services ?? []).map((s) => [s.id, s.title]));
  return rows.map((r) => ({
    ...r,
    serviceTitle: titles.get(r.service_id) ?? "—",
    other: people.get(side === "received" ? r.client_id : r.freelancer_id) ?? null,
  }));
}

export async function myProposals(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("proposals").select("*").eq("freelancer_id", userId).order("created_at", { ascending: false });
  const rows = data ?? [];
  const { data: projects } = rows.length
    ? await supabase.from("projects").select("id, title, status").in("id", [...new Set(rows.map((r) => r.project_id))])
    : { data: [] as { id: string; title: string; status: string }[] };
  const byId = new Map((projects ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, project: byId.get(r.project_id) ?? null }));
}

export async function proposalsForProject(projectId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("proposals").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
  const rows = data ?? [];
  const portfolioIds = [...new Set(rows.flatMap((r) => r.portfolio_item_ids))];
  const [people, { data: portfolio }] = await Promise.all([
    peopleById(supabase, rows.map((r) => r.freelancer_id)),
    portfolioIds.length
      ? supabase.from("portfolio_items").select("id, title, image_path, link_url").in("id", portfolioIds)
      : Promise.resolve({ data: [] as Pick<Tables<"portfolio_items">, "id" | "title" | "image_path" | "link_url">[] }),
  ]);
  const items = new Map((portfolio ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    freelancer: people.get(r.freelancer_id) ?? null,
    portfolio: r.portfolio_item_ids.map((id) => items.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
  }));
}

export async function myProposalFor(userId: string, projectId: string) {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("proposals").select("id, status").eq("project_id", projectId).eq("freelancer_id", userId).maybeSingle();
  return data;
}

export async function savedSet(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await db();
  if (!supabase) return new Set();
  const { data } = await supabase.from("saved_items").select("item_type, item_id").eq("user_id", userId);
  return new Set((data ?? []).map((s) => `${s.item_type}:${s.item_id}`));
}

export async function savedItems(userId: string) {
  const supabase = await db();
  if (!supabase) return { services: [], projects: [], freelancers: [] };
  const { data } = await supabase.from("saved_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const ids = (type: string) => (data ?? []).filter((s) => s.item_type === type).map((s) => s.item_id);
  const [services, projects, people] = await Promise.all([
    ids("service").length
      ? supabase.from("services").select(SERVICE_CARD_COLUMNS).in("id", ids("service")).then((r) => decorateServices(supabase, r.data ?? []))
      : Promise.resolve([] as ServiceCard[]),
    ids("project").length
      ? supabase.from("projects").select(PROJECT_CARD_COLUMNS).in("id", ids("project")).then((r) => r.data ?? [])
      : Promise.resolve([]),
    peopleById(supabase, ids("freelancer")),
  ]);
  return { services, projects, freelancers: [...people.values()] };
}

export async function dashboardCounts(userId: string) {
  const supabase = await db();
  if (!supabase) return { services: 0, requests: 0, proposals: 0, projects: 0 };
  const head = { count: "exact" as const, head: true };
  const [services, requests, proposals, projects] = await Promise.all([
    supabase.from("services").select("id", head).eq("owner_id", userId).eq("status", "published"),
    supabase.from("service_requests").select("id", head).or(`freelancer_id.eq.${userId},client_id.eq.${userId}`).in("status", ["pending", "accepted"]),
    supabase.from("proposals").select("id", head).eq("freelancer_id", userId).in("status", ["submitted", "shortlisted"]),
    supabase.from("projects").select("id", head).eq("client_id", userId).in("status", ["open", "in_review", "assigned", "in_progress"]),
  ]);
  return { services: services.count ?? 0, requests: requests.count ?? 0, proposals: proposals.count ?? 0, projects: projects.count ?? 0 };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
