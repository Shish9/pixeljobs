"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  fieldErrors,
  onboardingSchema,
  preferencesSchema,
  privacySchema,
  profileSchema,
  sniffImageType,
} from "@/lib/validation";

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(value) ? value : defaultLocale;
}

const UNIQUE_VIOLATION = "23505";

/** Every account action re-checks the session server-side; RLS + column grants are the final guard. */
async function authed() {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  if (!viewer || !supabase || viewer.profile.account_status !== "active") return null;
  return { viewer, supabase };
}

export async function completeOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authed();
  if (!ctx) return { status: "error", message: "errors.forbidden" };

  const raw = {
    isClient: formData.get("isClient"),
    isFreelancer: formData.get("isFreelancer"),
    username: formData.get("username"),
    city: formData.get("city") ?? "",
    preferredLocale: formData.get("preferredLocale"),
  };
  const values = { username: String(raw.username ?? ""), city: String(raw.city ?? "") };
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      is_client: parsed.data.isClient,
      is_freelancer: parsed.data.isFreelancer,
      city: parsed.data.city ?? null,
      preferred_locale: parsed.data.preferredLocale,
    })
    .eq("id", ctx.viewer.user.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { status: "error", fieldErrors: { username: "errors.usernameTaken" }, values };
    if (error.code === "23514") return { status: "error", fieldErrors: { username: "validation.username" }, values };
    return { status: "error", message: "errors.generic", values };
  }

  const mode = parsed.data.isFreelancer ? "freelancer" : "client";
  redirect(`/${parsed.data.preferredLocale}/dashboard?mode=${mode}&welcome=1`);
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authed();
  if (!ctx) return { status: "error", message: "errors.forbidden" };
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
    city: formData.get("city") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      city: parsed.data.city ?? null,
    })
    .eq("id", ctx.viewer.user.id);
  if (error) return { status: "error", message: "errors.generic" };

  revalidatePath(`/${localeFrom(formData)}`, "layout");
  return { status: "success", message: "common.saved" };
}

export async function updatePreferencesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authed();
  if (!ctx) return { status: "error", message: "errors.forbidden" };
  const parsed = preferencesSchema.safeParse({
    preferredLocale: formData.get("preferredLocale"),
    preferredCurrency: formData.get("preferredCurrency"),
    isClient: formData.get("isClient"),
    isFreelancer: formData.get("isFreelancer"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  if (!parsed.data.isClient && !parsed.data.isFreelancer) {
    return { status: "error", fieldErrors: { roles: "validation.pickRole" } };
  }

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      preferred_locale: parsed.data.preferredLocale,
      preferred_currency: parsed.data.preferredCurrency,
      is_client: parsed.data.isClient,
      is_freelancer: parsed.data.isFreelancer,
    })
    .eq("id", ctx.viewer.user.id);
  if (error) return { status: "error", message: "errors.generic" };

  const current = localeFrom(formData);
  if (parsed.data.preferredLocale !== current) redirect(`/${parsed.data.preferredLocale}/settings?saved=1`);
  revalidatePath(`/${current}`, "layout");
  return { status: "success", message: "common.saved" };
}

export async function updatePrivacyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authed();
  if (!ctx) return { status: "error", message: "errors.forbidden" };
  const parsed = privacySchema.safeParse({
    visibility: formData.get("visibility"),
    marketingEmails: formData.get("marketingEmails"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const userId = ctx.viewer.user.id;
  const [profileRes, settingsRes] = await Promise.all([
    ctx.supabase.from("profiles").update({ visibility: parsed.data.visibility }).eq("id", userId),
    ctx.supabase.from("account_settings").update({ marketing_emails: parsed.data.marketingEmails }).eq("user_id", userId),
  ]);
  if (profileRes.error || settingsRes.error) return { status: "error", message: "errors.generic" };
  return { status: "success", message: "common.saved" };
}

/**
 * Avatar upload: validated on the server (size + magic bytes, not the client-supplied MIME type), stored under
 * "<user id>/" so storage RLS applies, with a random file name to bust caches.
 */
export async function uploadAvatarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authed();
  if (!ctx) return { status: "error", message: "errors.forbidden" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { status: "error", fieldErrors: { avatar: "validation.required" } };
  if (file.size > AVATAR_MAX_BYTES) return { status: "error", fieldErrors: { avatar: "errors.uploadSize" } };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { status: "error", fieldErrors: { avatar: "errors.uploadType" } };

  const userId = ctx.viewer.user.id;
  const path = `${userId}/${crypto.randomUUID()}.${AVATAR_TYPES[type]}`;
  const { error: uploadError } = await ctx.supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (uploadError) return { status: "error", message: "errors.generic" };

  const previous = ctx.viewer.profile.avatar_path;
  const { error } = await ctx.supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    await ctx.supabase.storage.from("avatars").remove([path]);
    return { status: "error", message: "errors.generic" };
  }
  if (previous?.startsWith(`${userId}/`)) await ctx.supabase.storage.from("avatars").remove([previous]);

  revalidatePath(`/${localeFrom(formData)}`, "layout");
  return { status: "success", message: "common.saved" };
}

export async function removeAvatarAction(formData: FormData): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  const userId = ctx.viewer.user.id;
  const previous = ctx.viewer.profile.avatar_path;
  await ctx.supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (previous?.startsWith(`${userId}/`)) await ctx.supabase.storage.from("avatars").remove([previous]);
  revalidatePath(`/${localeFrom(formData)}`, "layout");
}
