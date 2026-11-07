"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { translate } from "@/i18n/translate";
import { idleState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/Alert";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "./actions";

export type AuthMessages = Pick<Dictionary, "auth" | "errors" | "validation" | "common">;

type Common = { locale: string; m: AuthMessages };

function useT(m: AuthMessages) {
  return (key: string | undefined, vars?: Record<string, string | number>) =>
    key ? translate(m, key, { max: 80, min: 2, ...vars }) : undefined;
}

function FormError({ state, m }: { state: ActionState; m: AuthMessages }) {
  const t = useT(m);
  if (state.status !== "error" || !state.message) return null;
  return <Alert tone="danger">{t(state.message)}</Alert>;
}

export function SignInForm({ locale, m, next }: Common & { next?: string }) {
  const [state, action] = useActionState(signInAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormError state={state} m={m} />
      <Field id="email" label={m.auth.email} error={t(fe.email)}>
        {(describedBy, invalid) => (
          <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required
            defaultValue={state.values?.email} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field id="password" label={m.auth.password} error={t(fe.password)}>
        {(describedBy, invalid) => (
          <Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required
            aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <div className="flex justify-end">
        <Link href={`/${locale}/forgot-password`} className="text-sm font-semibold text-brand-700 hover:underline">
          {m.auth.forgotLink}
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel={m.common.loading}>{m.auth.signInButton}</SubmitButton>
    </form>
  );
}

export function SignUpForm({ locale, m }: Common) {
  const [state, action] = useActionState(signUpAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <Alert tone="success" title={m.auth.checkEmailTitle}>
        <p>{t(state.message, { email: state.values?.email ?? "" })}</p>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} m={m} />
      <Field id="displayName" label={m.auth.displayName} error={t(fe.displayName)}>
        {(describedBy, invalid) => (
          <Input id="displayName" name="displayName" autoComplete="name" required maxLength={80}
            defaultValue={state.values?.displayName} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field id="email" label={m.auth.email} error={t(fe.email)}>
        {(describedBy, invalid) => (
          <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required
            defaultValue={state.values?.email} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field id="password" label={m.auth.password} hint={m.auth.passwordHint} error={t(fe.password, { max: 72 })}>
        {(describedBy, invalid) => (
          <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" required minLength={8}
            aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <p className="text-xs text-ink-subtle">{m.auth.agree}</p>
      <SubmitButton className="w-full" pendingLabel={m.common.loading}>{m.auth.signUpButton}</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ locale, m }: Common) {
  const [state, action] = useActionState(forgotPasswordAction, idleState);
  const t = useT(m);
  if (state.status === "success") return <Alert tone="success">{t(state.message)}</Alert>;
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} m={m} />
      <Field id="email" label={m.auth.email} error={t(state.fieldErrors?.email)}>
        {(describedBy, invalid) => (
          <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required
            defaultValue={state.values?.email} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <SubmitButton className="w-full" pendingLabel={m.common.loading}>{m.auth.forgotButton}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ locale, m }: Common) {
  const [state, action] = useActionState(resetPasswordAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} m={m} />
      <Field id="password" label={m.auth.newPassword} hint={m.auth.passwordHint} error={t(fe.password, { max: 72 })}>
        {(describedBy, invalid) => (
          <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" required minLength={8}
            aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field id="confirmPassword" label={m.auth.confirmPassword} error={t(fe.confirmPassword)}>
        {(describedBy, invalid) => (
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required
            aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <SubmitButton className="w-full" pendingLabel={m.common.saving}>{m.auth.resetButton}</SubmitButton>
    </form>
  );
}
