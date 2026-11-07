"use client";

import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { localeMeta, locales } from "@/i18n/config";
import { translate } from "@/i18n/translate";
import { currencies } from "@/lib/currency";
import { idleState, type ActionState } from "@/lib/action-state";
import {
  completeOnboardingAction,
  removeAvatarAction,
  updatePreferencesAction,
  updatePrivacyAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/app/[lang]/account-actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type AccountMessages = Pick<
  Dictionary,
  "onboarding" | "settings" | "errors" | "validation" | "common" | "cities" | "nav" | "auth"
>;

const CITY_KEYS = ["erbil", "sulaymaniyah", "duhok", "halabja", "kirkuk", "baghdad", "basra", "mosul", "najaf", "karbala"] as const;

function useT(m: AccountMessages) {
  return (key?: string, vars?: Record<string, string | number>) => (key ? translate(m, key, { min: 2, ...vars }) : undefined);
}

function Status({ state, m }: { state: ActionState; m: AccountMessages }) {
  const t = useT(m);
  if (state.status === "error" && state.message) return <Alert tone="danger">{t(state.message)}</Alert>;
  if (state.status === "success") return <Alert tone="success">{t(state.message ?? "common.saved")}</Alert>;
  return null;
}

function CitySelect({ m, defaultValue, describedBy, invalid }: { m: AccountMessages; defaultValue?: string | null; describedBy?: string; invalid?: boolean }) {
  return (
    <Select id="city" name="city" defaultValue={defaultValue ?? ""} aria-describedby={describedBy} aria-invalid={invalid}>
      <option value="">{m.onboarding.cityPlaceholder}</option>
      {CITY_KEYS.map((c) => (
        <option key={c} value={c}>{m.cities[c]}</option>
      ))}
      <option value="other">{m.onboarding.otherCity}</option>
    </Select>
  );
}

function LocaleSelect({ id, defaultValue }: { id: string; defaultValue: string }) {
  return (
    <Select id={id} name="preferredLocale" defaultValue={defaultValue}>
      {locales.map((l) => (
        <option key={l} value={l} lang={localeMeta[l].htmlLang}>{localeMeta[l].label}</option>
      ))}
    </Select>
  );
}

export function OnboardingForm({ locale, m, defaults }: {
  locale: string;
  m: AccountMessages;
  defaults: { username: string; city: string | null; isClient: boolean; isFreelancer: boolean };
}) {
  const [state, action] = useActionState(completeOnboardingAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      <Status state={state} m={m} />
      <fieldset className="space-y-3" aria-describedby={fe.roles ? "roles-error" : "roles-hint"}>
        <legend className="text-base font-bold">{m.onboarding.stepRoles}</legend>
        <p id="roles-hint" className="text-sm text-ink-subtle">{m.onboarding.rolesHint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="isClient" defaultChecked={defaults.isClient} title={m.onboarding.roleClient} description={m.onboarding.roleClientBody} />
          <ChoiceCard name="isFreelancer" defaultChecked={defaults.isFreelancer} title={m.onboarding.roleFreelancer} description={m.onboarding.roleFreelancerBody} />
        </div>
        {fe.roles && <p id="roles-error" className="text-sm font-medium text-danger-700">{t(fe.roles)}</p>}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-base font-bold">{m.onboarding.stepBasics}</legend>
        <Field id="username" label={m.onboarding.username} hint={m.onboarding.usernameHint} error={t(fe.username)}>
          {(d, invalid) => (
            <Input id="username" name="username" dir="ltr" autoComplete="username" required minLength={3} maxLength={30}
              pattern="[a-z0-9][a-z0-9._]{1,28}[a-z0-9]" defaultValue={state.values?.username ?? defaults.username}
              aria-describedby={d} aria-invalid={invalid} />
          )}
        </Field>
        <Field id="city" label={m.onboarding.city} optionalLabel={m.common.optional} error={t(fe.city)}>
          {(d, invalid) => <CitySelect m={m} defaultValue={state.values?.city ?? defaults.city} describedBy={d} invalid={invalid} />}
        </Field>
        <Field id="preferredLocale" label={m.onboarding.preferredLanguage}>
          {() => <LocaleSelect id="preferredLocale" defaultValue={locale} />}
        </Field>
      </fieldset>

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel={m.common.saving}>{m.onboarding.finish}</SubmitButton>
    </form>
  );
}

type ProfileDefaults = { displayName: string; headline: string | null; bio: string | null; city: string | null };

export function ProfileForm({ locale, m, defaults }: { locale: string; m: AccountMessages; defaults: ProfileDefaults }) {
  const [state, action] = useActionState(updateProfileAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <Status state={state} m={m} />
      <Field id="displayName" label={m.auth.displayName} error={t(fe.displayName, { max: 80 })}>
        {(d, invalid) => <Input id="displayName" name="displayName" autoComplete="name" required maxLength={80} defaultValue={defaults.displayName} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <Field id="headline" label={m.settings.headline} optionalLabel={m.common.optional} error={t(fe.headline, { max: 120 })}>
        {(d, invalid) => <Input id="headline" name="headline" maxLength={120} placeholder={m.settings.headlinePlaceholder} defaultValue={defaults.headline ?? ""} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <Field id="bio" label={m.settings.bio} optionalLabel={m.common.optional} error={t(fe.bio, { max: 2000 })}>
        {(d, invalid) => <Textarea id="bio" name="bio" rows={5} maxLength={2000} defaultValue={defaults.bio ?? ""} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <Field id="city" label={m.onboarding.city} optionalLabel={m.common.optional}>
        {(d) => <CitySelect m={m} defaultValue={defaults.city} describedBy={d} />}
      </Field>
      <SubmitButton pendingLabel={m.common.saving}>{m.common.save}</SubmitButton>
    </form>
  );
}

export function AvatarForm({ locale, m, current }: { locale: string; m: AccountMessages; current: string | null }) {
  const [state, action] = useActionState(uploadAvatarAction, idleState);
  const t = useT(m);
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="size-20 shrink-0 overflow-hidden rounded-full border border-line bg-sunken">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element -- user avatar from Supabase storage
          <img src={current} alt={m.settings.avatar} className="size-full object-cover" />
        )}
      </div>
      <div className="flex-1 space-y-3">
        <form action={action} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <Status state={state} m={m} />
          <Field id="avatar" label={m.settings.avatar} hint={m.settings.avatarHint} error={t(state.fieldErrors?.avatar)}>
            {(d, invalid) => (
              <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required
                aria-describedby={d} aria-invalid={invalid}
                className="block w-full text-sm text-ink-muted file:me-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-sunken" />
            )}
          </Field>
          <SubmitButton variant="secondary" size="sm" pendingLabel={m.common.saving}>{m.settings.avatarUpload}</SubmitButton>
        </form>
        {current && (
          <form action={removeAvatarAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost" size="sm" className="text-danger-700">{m.settings.avatarRemove}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function PreferencesForm({ locale, m, defaults }: {
  locale: string;
  m: AccountMessages;
  defaults: { preferredLocale: string; preferredCurrency: string; isClient: boolean; isFreelancer: boolean };
}) {
  const [state, action] = useActionState(updatePreferencesAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <Status state={state} m={m} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{m.settings.rolesLabel}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="isClient" defaultChecked={defaults.isClient} title={m.onboarding.roleClient} description={m.onboarding.roleClientBody} />
          <ChoiceCard name="isFreelancer" defaultChecked={defaults.isFreelancer} title={m.onboarding.roleFreelancer} description={m.onboarding.roleFreelancerBody} />
        </div>
        {fe.roles && <p className="text-sm font-medium text-danger-700" role="alert">{t(fe.roles)}</p>}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="preferredLocale" label={m.common.language}>
          {() => <LocaleSelect id="preferredLocale" defaultValue={defaults.preferredLocale} />}
        </Field>
        <Field id="preferredCurrency" label={m.settings.currency}>
          {() => (
            <Select id="preferredCurrency" name="preferredCurrency" defaultValue={defaults.preferredCurrency}>
              {Object.keys(currencies).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <SubmitButton pendingLabel={m.common.saving}>{m.common.save}</SubmitButton>
    </form>
  );
}

export function PrivacyForm({ locale, m, defaults }: {
  locale: string;
  m: AccountMessages;
  defaults: { visibility: "public" | "private"; marketingEmails: boolean };
}) {
  const [state, action] = useActionState(updatePrivacyAction, idleState);
  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <Status state={state} m={m} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{m.settings.visibility}</legend>
        <ChoiceCard type="radio" name="visibility" value="public" defaultChecked={defaults.visibility === "public"} title={m.settings.visibilityPublic} />
        <ChoiceCard type="radio" name="visibility" value="private" defaultChecked={defaults.visibility === "private"} title={m.settings.visibilityPrivate} />
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="marketingEmails" defaultChecked={defaults.marketingEmails} className="mt-0.5 size-4 accent-brand-600" />
        <span>{m.settings.marketingEmails}</span>
      </label>
      <SubmitButton pendingLabel={m.common.saving}>{m.common.save}</SubmitButton>
    </form>
  );
}
