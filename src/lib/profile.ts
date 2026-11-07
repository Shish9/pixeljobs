import type { Tables } from "@/lib/database.types";

type ProfileLike = Pick<
  Tables<"profiles">,
  "display_name" | "username" | "headline" | "bio" | "avatar_path" | "city" | "is_freelancer" | "is_client"
>;

/** Weighted profile completion. Freelancer-specific items (skills, portfolio, services) join in Phase 6. */
export function profileCompletion(p: ProfileLike): { percent: number; missing: string[] } {
  const items: [string, boolean, number][] = [
    ["displayName", p.display_name.trim().length >= 2, 15],
    ["username", Boolean(p.username), 15],
    ["mode", p.is_freelancer || p.is_client, 10],
    ["avatar", Boolean(p.avatar_path), 20],
    ["headline", Boolean(p.headline?.trim()), 15],
    ["bio", (p.bio?.trim().length ?? 0) >= 40, 15],
    ["city", Boolean(p.city), 10],
  ];
  const total = items.reduce((sum, [, , w]) => sum + w, 0);
  const done = items.reduce((sum, [, ok, w]) => sum + (ok ? w : 0), 0);
  return { percent: Math.round((done / total) * 100), missing: items.filter(([, ok]) => !ok).map(([k]) => k) };
}

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/avatars/${path}` : null;
}
