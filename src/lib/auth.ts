import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import type { Tables, Enums } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  user: User;
  profile: Tables<"profiles">;
  roles: Enums<"app_role">[];
  isStaff: boolean;
  isAdmin: boolean;
  emailConfirmed: boolean;
};

/**
 * Current signed-in user with profile and staff roles, memoised per request.
 * `getUser()` revalidates the session with Supabase Auth, so this is safe for authorization decisions.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (!profile) return null;

  const roles = (roleRows ?? []).map((r) => r.role);
  return {
    user,
    profile,
    roles,
    isStaff: roles.includes("admin") || roles.includes("moderator"),
    isAdmin: roles.includes("admin"),
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
});

export async function requireViewer(locale: Locale, nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/${locale}/sign-in${next}`);
  }
  if (viewer.profile.account_status !== "active") redirect(`/${locale}/sign-in?status=${viewer.profile.account_status}`);
  return viewer;
}

/** Signed in AND finished onboarding; otherwise sends the user to the onboarding flow. */
export async function requireOnboardedViewer(locale: Locale, nextPath?: string): Promise<Viewer> {
  const viewer = await requireViewer(locale, nextPath);
  if (!viewer.profile.onboarded_at) redirect(`/${locale}/onboarding`);
  return viewer;
}

/** Staff-only pages return 404 to everyone else so the admin area isn't discoverable. */
export async function requireStaff(locale: Locale): Promise<Viewer> {
  const viewer = await requireViewer(locale, `/${locale}/admin`);
  if (!viewer.isStaff) notFound();
  return viewer;
}
