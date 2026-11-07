"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(value) ? value : defaultLocale;
}

/** Map Supabase Auth errors to dictionary keys without leaking internals. */
function authErrorKey(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "errors.invalidCredentials";
    case "email_not_confirmed":
      return "errors.emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "errors.emailTaken";
    case "weak_password":
      return "errors.weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "errors.rateLimited";
    default:
      if (error.status === 429) return "errors.rateLimited";
      return "errors.generic";
  }
}

const notConfigured: ActionState = { status: "error", message: "errors.notConfigured" };

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  if (!supabase) return notConfigured;
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorKey(error), values };

  redirect(safeRedirectPath(formData.get("next"), `/${locale}/dashboard`));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const raw = {
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const values = { displayName: String(raw.displayName ?? ""), email: String(raw.email ?? "") };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  if (!supabase) return notConfigured;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(`/${locale}/onboarding`)}`,
      data: { display_name: parsed.data.displayName, preferred_locale: locale },
    },
  });
  if (error) return { status: "error", message: authErrorKey(error), values };

  // Email confirmation disabled in Supabase → a session exists immediately.
  if (data.session) redirect(`/${locale}/onboarding`);

  // Same response whether or not the email was already registered (prevents account enumeration).
  return { status: "success", message: "auth.checkEmailBody", values: { email: parsed.data.email } };
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect(`/${locale}?signed_out=1`);
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { email: String(formData.get("email") ?? "") } };
  }
  const supabase = await createClient();
  if (!supabase) return notConfigured;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(`/${locale}/reset-password`)}`,
  });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { status: "error", message: "errors.rateLimited" };
  }
  // Always report success so the form can't be used to discover registered emails.
  return { status: "success", message: "auth.forgotSent" };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return notConfigured;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "error", message: "auth.linkInvalid" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorKey(error) };
  redirect(`/${locale}/dashboard?password=updated`);
}
