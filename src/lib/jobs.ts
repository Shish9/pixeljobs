import "server-only";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Job = Tables<"jobs">;

const JOB_COLUMNS =
  "id, slug, job_title, company_name, company_website, role_category, job_type, remote_policy, location, salary_range, job_description, apply_url, featured, published_date, expires_at, status, source, listing_type, created_at, updated_at";

/** Active, unexpired legacy jobs. RLS already limits anon to status = 'active'. */
export async function listJobs(): Promise<Job[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("featured", { ascending: false })
    .order("published_date", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[jobs] list failed", error.message);
    return [];
  }
  return data;
}

export async function getJob(slug: string): Promise<Job | null> {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  return data;
}
