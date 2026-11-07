"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { translate } from "@/i18n/translate";
import { idleState, type ActionState } from "@/lib/action-state";
import {
  addEntryAction,
  addPortfolioAction,
  requestServiceAction,
  saveProjectAction,
  saveServiceAction,
  sendProposalAction,
  updateProfileDetailsAction,
} from "@/lib/actions/market";
import {
  AVAILABILITY,
  BUDGET_TYPES,
  CATEGORY_KEYS,
  ENTRY_KINDS,
  EXPERIENCE_LEVELS,
  LANG_KEYS,
  TIERS,
  TIMELINES,
  type Tier,
} from "@/lib/taxonomy";
import { ALL_CITY_KEYS } from "@/lib/cities";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type MarketMessages = Pick<Dictionary, "market" | "errors" | "validation" | "common" | "categories" | "cities" | "onboarding">;

function useT(m: MarketMessages) {
  return (key?: string, vars?: Record<string, string | number>) => (key ? translate(m, key, { min: 2, max: 5000, ...vars }) : undefined);
}

function Status({ state, m }: { state: ActionState; m: MarketMessages }) {
  const t = useT(m);
  if (state.status === "error" && state.message) return <Alert tone="danger">{t(state.message)}</Alert>;
  if (state.status === "error" && state.fieldErrors && Object.keys(state.fieldErrors).length > 0)
    return <Alert tone="danger">{m.errors.checkFields}</Alert>;
  if (state.status === "success") return <Alert tone="success">{t(state.message ?? "common.saved")}</Alert>;
  return null;
}

const Hidden = ({ name, value }: { name: string; value: string }) => <input type="hidden" name={name} value={value} />;

function CategorySelect({ m, value, id = "category", invalid, describedBy }: { m: MarketMessages; value?: string; id?: string; invalid?: boolean; describedBy?: string }) {
  return (
    <Select key={value ?? ""} id={id} name="category" defaultValue={value ?? ""} required aria-invalid={invalid} aria-describedby={describedBy}>
      <option value="" disabled>{m.market.fCategory}</option>
      {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{m.categories[k]}</option>)}
    </Select>
  );
}

function CitySelect({ m, value, id = "city" }: { m: MarketMessages; value?: string | null; id?: string }) {
  return (
    <Select key={value ?? ""} id={id} name="city" defaultValue={value ?? ""}>
      <option value="">{m.onboarding.cityPlaceholder}</option>
      {ALL_CITY_KEYS.map((k) => <option key={k} value={k}>{m.cities[k as keyof typeof m.cities]}</option>)}
      <option value="other">{m.onboarding.otherCity}</option>
    </Select>
  );
}

function LanguageChecks({ m, values, legend }: { m: MarketMessages; values: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {LANG_KEYS.map((k) => (
          <label key={`${k}-${values.includes(k)}`} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#bdb4a3] px-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
            <input type="checkbox" name="languages" value={k} defaultChecked={values.includes(k)} className="size-4 accent-brand-600" />
            {translate(m, `market.lang_${k}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FileField({ m, id, name, label, error, current }: { m: MarketMessages; id: string; name: string; label: string; error?: string; current?: string | null }) {
  return (
    <Field id={id} label={label} hint={m.market.fImageHint} optionalLabel={m.common.optional} error={error}>
      {(d, invalid) => (
        <div className="flex items-center gap-4">
          {current && (
            // eslint-disable-next-line @next/next/no-img-element -- current upload preview
            <img src={current} alt={m.market.currentCover} className="size-16 shrink-0 rounded-md border border-line object-cover" />
          )}
          <input id={id} name={name} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={d} aria-invalid={invalid}
            className="block w-full text-sm text-ink-muted file:me-3 file:rounded-md file:border file:border-ink file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-sunken" />
        </div>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------------------------------------------

/** Value to show in a field: what the person last submitted (kept across validation errors), else the saved value. */
function useValues(state: ActionState) {
  const text = (key: string, fallback?: string | number | null) => state.values?.[key] ?? (fallback == null ? "" : String(fallback));
  const list = (key: string, fallback: string[]) => (state.values?.[key] !== undefined ? state.values[key]!.split(",").filter(Boolean) : fallback);
  return { text, list };
}

/** Clears an "add" form after the server action succeeds. */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  return ref;
}

export function ProfileDetailsForm({ locale, m, defaults }: {
  locale: string;
  m: MarketMessages;
  defaults: { skills: string[]; languages: string[]; availability: string; rate: number | null; websiteUrl: string | null };
}) {
  const [state, action] = useActionState(updateProfileDetailsAction, idleState);
  const { text, list } = useValues(state);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  return (
    <form action={action} noValidate className="space-y-5">
      <Hidden name="locale" value={locale} />
      <Status state={state} m={m} />
      <Field id="skills" label={mk.fSkills} hint={mk.fSkillsHint} error={t(fe.skills)}>
        {(d, invalid) => <Input id="skills" name="skills" defaultValue={text("skills", defaults.skills.join(", "))} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <LanguageChecks m={m} values={list("languages", defaults.languages)} legend={mk.fLanguages} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="availability" label={mk.fAvailability}>
          {() => (
            <Select key={text("availability", defaults.availability)} id="availability" name="availability" defaultValue={text("availability", defaults.availability)}>
              {AVAILABILITY.map((a) => <option key={a} value={a}>{translate(m, `market.avail_${a}`)}</option>)}
            </Select>
          )}
        </Field>
        <Field id="rate" label={mk.fRate} hint={mk.fRateHint} optionalLabel={m.common.optional} error={t(fe.rate)}>
          {(d, invalid) => <Input id="rate" name="rate" inputMode="numeric" dir="ltr" defaultValue={text("rate", defaults.rate)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
      </div>
      <Field id="websiteUrl" label={mk.fWebsite} optionalLabel={m.common.optional} error={t(fe.websiteUrl)}>
        {(d, invalid) => <Input id="websiteUrl" name="websiteUrl" type="url" dir="ltr" placeholder="https://" defaultValue={text("websiteUrl", defaults.websiteUrl)} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.saving}>{m.common.save}</SubmitButton>
    </form>
  );
}

export function EntryForm({ locale, m }: { locale: string; m: MarketMessages }) {
  const [state, action] = useActionState(addEntryAction, idleState);
  const formRef = useResetOnSuccess(state);
  const { text } = useValues(state);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  return (
    <form ref={formRef} action={action} noValidate className="space-y-4">
      <Hidden name="locale" value={locale} />
      <Status state={state} m={m} />
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field id="kind" label={mk.fKind}>
          {() => (
            <Select key={text("kind", "experience")} id="kind" name="kind" defaultValue={text("kind", "experience")}>
              {ENTRY_KINDS.map((k) => <option key={k} value={k}>{translate(m, `market.entry_${k}`)}</option>)}
            </Select>
          )}
        </Field>
        <Field id="entry-title" label={mk.fTitle} error={t(fe.title, { max: 120 })}>
          {(d, invalid) => <Input id="entry-title" name="title" required maxLength={120} defaultValue={text("title")} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="organization" label={mk.fOrganization} optionalLabel={m.common.optional}>
          {(d) => <Input id="organization" name="organization" maxLength={120} defaultValue={text("organization")} aria-describedby={d} />}
        </Field>
        <Field id="startYear" label={mk.fStartYear} optionalLabel={m.common.optional} error={t(fe.startYear)}>
          {(d, invalid) => <Input id="startYear" name="startYear" inputMode="numeric" dir="ltr" maxLength={4} defaultValue={text("startYear")} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <Field id="endYear" label={mk.fEndYear} optionalLabel={m.common.optional} error={t(fe.endYear)}>
          {(d, invalid) => <Input id="endYear" name="endYear" inputMode="numeric" dir="ltr" maxLength={4} defaultValue={text("endYear")} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel={m.common.saving}>{mk.addEntry}</SubmitButton>
    </form>
  );
}

export function PortfolioForm({ locale, m }: { locale: string; m: MarketMessages }) {
  const [state, action] = useActionState(addPortfolioAction, idleState);
  const formRef = useResetOnSuccess(state);
  const { text } = useValues(state);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  return (
    <form ref={formRef} action={action} noValidate className="space-y-4">
      <Hidden name="locale" value={locale} />
      <Status state={state} m={m} />
      <Field id="p-title" label={mk.fTitle} error={t(fe.title, { max: 120 })}>
        {(d, invalid) => <Input id="p-title" name="title" required maxLength={120} defaultValue={text("title")} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <Field id="p-description" label={mk.fDescription} optionalLabel={m.common.optional} error={t(fe.description, { max: 2000 })}>
        {(d, invalid) => <Textarea id="p-description" name="description" rows={3} maxLength={2000} defaultValue={text("description")} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <FileField m={m} id="p-image" name="image" label={mk.fImage} error={t(fe.image)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-link" label={mk.fLink} optionalLabel={m.common.optional} error={t(fe.linkUrl)}>
          {(d, invalid) => <Input id="p-link" name="linkUrl" type="url" dir="ltr" placeholder="https://" defaultValue={text("linkUrl")} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <Field id="p-skills" label={mk.fSkills} hint={mk.fSkillsHint} optionalLabel={m.common.optional}>
          {(d) => <Input id="p-skills" name="skills" defaultValue={text("skills")} aria-describedby={d} />}
        </Field>
      </div>
      <Field id="p-outcome" label={mk.fOutcome} optionalLabel={m.common.optional} error={t(fe.outcome, { max: 300 })}>
        {(d, invalid) => <Input id="p-outcome" name="outcome" maxLength={300} defaultValue={text("outcome")} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.saving}>{mk.add}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------------------------

type PackageDefaults = { tier: Tier; title: string; description: string | null; price_minor: number; delivery_days: number; revisions: number; deliverables: string[] };

export function ServiceEditor({ locale, m, service, packages, coverUrl }: {
  locale: string;
  m: MarketMessages;
  service?: { id: string; title: string; category: string; description: string; requirements: string | null; city: string | null; languages: string[]; faqs: { q: string; a: string }[]; status: string };
  packages: PackageDefaults[];
  coverUrl: string | null;
}) {
  const [state, action] = useActionState(saveServiceAction, idleState);
  const { text, list } = useValues(state);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  const pkg = (tier: Tier) => packages.find((p) => p.tier === tier);
  const faqs = service?.faqs ?? [];

  return (
    <form action={action} noValidate className="space-y-10">
      <Hidden name="locale" value={locale} />
      {service && <Hidden name="id" value={service.id} />}
      <Status state={state} m={m} />

      <section aria-labelledby="svc-details" className="space-y-5">
        <h2 id="svc-details" className="border-b border-ink pb-2 text-xl font-extrabold">{mk.detailsTitle}</h2>
        <Field id="title" label={mk.fTitle} error={t(fe.title, { min: 10, max: 100 })}>
          {(d, invalid) => <Input id="title" name="title" required minLength={10} maxLength={100} defaultValue={text("title", service?.title)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="category" label={mk.fCategory} error={t(fe.category)}>
            {(d, invalid) => <CategorySelect m={m} value={text("category", service?.category)} invalid={invalid} describedBy={d} />}
          </Field>
          <Field id="city" label={mk.fCity} optionalLabel={m.common.optional}>
            {() => <CitySelect m={m} value={text("city", service?.city)} />}
          </Field>
        </div>
        <Field id="description" label={mk.fDescription} hint={mk.publishChecklist} error={t(fe.description, { max: 5000 })}>
          {(d, invalid) => <Textarea id="description" name="description" rows={7} maxLength={5000} defaultValue={text("description", service?.description)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <Field id="requirements" label={mk.fRequirements} optionalLabel={m.common.optional} error={t(fe.requirements, { max: 2000 })}>
          {(d, invalid) => <Textarea id="requirements" name="requirements" rows={3} maxLength={2000} defaultValue={text("requirements", service?.requirements)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <LanguageChecks m={m} values={list("languages", service?.languages ?? [])} legend={mk.fLanguages} />
        <FileField m={m} id="cover" name="cover" label={mk.fCover} error={t(fe.cover)} current={coverUrl} />
      </section>

      <section aria-labelledby="svc-packages">
        <h2 id="svc-packages" className="border-b border-ink pb-2 text-xl font-extrabold">{mk.packagesTitle}</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const p = pkg(tier);
            const id = (f: string) => `${tier}_${f}`;
            return (
              <fieldset key={tier} className="space-y-4 rounded-md border border-line bg-surface p-4">
                <legend className="px-1 text-lg font-extrabold">
                  {translate(m, `market.tier_${tier}`)}{" "}
                  <span className="text-xs font-semibold text-ink-subtle">{tier === "basic" ? mk.basicRequired : mk.packageOptional}</span>
                </legend>
                <Field id={id("title")} label={mk.fPackageTitle} error={t(fe[id("title")], { max: 60 })}>
                  {(d, invalid) => <Input id={id("title")} name={id("title")} maxLength={60} defaultValue={text(id("title"), p?.title)} aria-describedby={d} aria-invalid={invalid} />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id={id("price")} label={mk.fPrice} error={t(fe[id("price")])}>
                    {(d, invalid) => <Input id={id("price")} name={id("price")} inputMode="numeric" dir="ltr" defaultValue={text(id("price"), p?.price_minor)} aria-describedby={d} aria-invalid={invalid} />}
                  </Field>
                  <Field id={id("deliveryDays")} label={mk.fDeliveryDays} error={t(fe[id("deliveryDays")])}>
                    {(d, invalid) => <Input id={id("deliveryDays")} name={id("deliveryDays")} inputMode="numeric" dir="ltr" defaultValue={text(id("deliveryDays"), p?.delivery_days)} aria-describedby={d} aria-invalid={invalid} />}
                  </Field>
                </div>
                <Field id={id("revisions")} label={mk.fRevisions} error={t(fe[id("revisions")])}>
                  {(d, invalid) => <Input id={id("revisions")} name={id("revisions")} inputMode="numeric" dir="ltr" defaultValue={text(id("revisions"), p?.revisions ?? 1)} aria-describedby={d} aria-invalid={invalid} />}
                </Field>
                <Field id={id("deliverables")} label={mk.fDeliverables} hint={mk.fDeliverablesHint} optionalLabel={m.common.optional}>
                  {(d) => <Textarea id={id("deliverables")} name={id("deliverables")} rows={3} defaultValue={text(id("deliverables"), p?.deliverables.join("\n"))} aria-describedby={d} />}
                </Field>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="svc-faqs" className="space-y-4">
        <h2 id="svc-faqs" className="border-b border-ink pb-2 text-xl font-extrabold">{mk.faqsTitle} <span className="text-sm font-semibold text-ink-subtle">{m.common.optional}</span></h2>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Field id={`faq_q_${i}`} label={`${mk.fFaqQ} ${i + 1}`}>
              {(d) => <Input id={`faq_q_${i}`} name={`faq_q_${i}`} maxLength={200} defaultValue={text(`faq_q_${i}`, faqs[i]?.q)} aria-describedby={d} />}
            </Field>
            <Field id={`faq_a_${i}`} label={`${mk.fFaqA} ${i + 1}`}>
              {(d) => <Input id={`faq_a_${i}`} name={`faq_a_${i}`} maxLength={1000} defaultValue={text(`faq_a_${i}`, faqs[i]?.a)} aria-describedby={d} />}
            </Field>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3 border-t border-ink pt-6">
        <SubmitButton name="intent" value="publish" pendingLabel={m.common.saving}>
          {service?.status === "published" ? mk.saveChanges : mk.publish}
        </SubmitButton>
        {service?.status !== "published" && (
          <SubmitButton name="intent" value="draft" variant="secondary" pendingLabel={m.common.saving}>{mk.saveDraft}</SubmitButton>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------------------------

export function RequestForm({ locale, m, serviceId, tiers, priceLabels }: {
  locale: string;
  m: MarketMessages;
  serviceId: string;
  tiers: Tier[];
  priceLabels: Record<string, string>;
}) {
  const [state, action] = useActionState(requestServiceAction, idleState);
  const [tier, setTier] = useState<Tier>(tiers.includes("standard") ? "standard" : tiers[0]!);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  if (state.status === "success") return <Alert tone="success">{t(state.message)}</Alert>;
  return (
    <form action={action} noValidate className="space-y-4">
      <Hidden name="locale" value={locale} />
      <Hidden name="serviceId" value={serviceId} />
      <Status state={state} m={m} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{mk.selectedTier}</legend>
        <div className="grid gap-2">
          {tiers.map((k) => (
            <label key={k} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-[#bdb4a3] px-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
              <span className="flex items-center gap-2">
                <input type="radio" name="tier" value={k} checked={tier === k} onChange={() => setTier(k)} className="size-4 accent-brand-600" />
                <span className="font-semibold">{translate(m, `market.tier_${k}`)}</span>
              </span>
              <span className="text-sm font-bold">{priceLabels[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="message" label={mk.fMessage} hint={mk.fMessageHint} error={t(fe.message, { min: 20, max: 2000 })}>
        {(d, invalid) => <Textarea id="message" name="message" rows={5} required minLength={20} maxLength={2000} defaultValue={state.values?.message} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel={m.common.loading}>{mk.requestPackage}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------------------------

export function ProjectForm({ locale, m, project }: {
  locale: string;
  m: MarketMessages;
  project?: {
    id: string; title: string; description: string; category: string; skills: string[]; budget_type: string;
    budget_min_minor: number | null; budget_max_minor: number | null; timeline: string; experience_level: string;
    city: string | null; visibility: string; status: string;
  };
}) {
  const [state, action] = useActionState(saveProjectAction, idleState);
  const { text } = useValues(state);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  return (
    <form action={action} noValidate className="space-y-5">
      <Hidden name="locale" value={locale} />
      {project && <Hidden name="id" value={project.id} />}
      <Status state={state} m={m} />
      <Field id="title" label={mk.fTitle} error={t(fe.title, { min: 10, max: 120 })}>
        {(d, invalid) => <Input id="title" name="title" required minLength={10} maxLength={120} defaultValue={text("title", project?.title)} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <Field id="description" label={mk.fDescription} error={t(fe.description, { min: 30, max: 5000 })}>
        {(d, invalid) => <Textarea id="description" name="description" rows={7} required minLength={30} maxLength={5000} defaultValue={text("description", project?.description)} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label={mk.fCategory} error={t(fe.category)}>
          {(d, invalid) => <CategorySelect m={m} value={text("category", project?.category)} invalid={invalid} describedBy={d} />}
        </Field>
        <Field id="skills" label={mk.fSkills} hint={mk.fSkillsHint} optionalLabel={m.common.optional}>
          {(d) => <Input id="skills" name="skills" defaultValue={text("skills", project?.skills.join(", "))} aria-describedby={d} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="budgetType" label={mk.fBudgetType}>
          {() => (
            <Select key={text("budgetType", project?.budget_type ?? "fixed")} id="budgetType" name="budgetType" defaultValue={text("budgetType", project?.budget_type ?? "fixed")}>
              {BUDGET_TYPES.map((b) => <option key={b} value={b}>{translate(m, `market.budget_${b}`)}</option>)}
            </Select>
          )}
        </Field>
        <Field id="budgetMin" label={mk.fBudgetMin} optionalLabel={m.common.optional} error={t(fe.budgetMin)}>
          {(d, invalid) => <Input id="budgetMin" name="budgetMin" inputMode="numeric" dir="ltr" defaultValue={text("budgetMin", project?.budget_min_minor)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <Field id="budgetMax" label={mk.fBudgetMax} optionalLabel={m.common.optional} error={t(fe.budgetMax)}>
          {(d, invalid) => <Input id="budgetMax" name="budgetMax" inputMode="numeric" dir="ltr" defaultValue={text("budgetMax", project?.budget_max_minor)} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="timeline" label={mk.fTimeline}>
          {() => (
            <Select key={text("timeline", project?.timeline ?? "1_4w")} id="timeline" name="timeline" defaultValue={text("timeline", project?.timeline ?? "1_4w")}>
              {TIMELINES.map((x) => <option key={x} value={x}>{translate(m, `market.timeline_${x}`)}</option>)}
            </Select>
          )}
        </Field>
        <Field id="experienceLevel" label={mk.fExperience}>
          {() => (
            <Select key={text("experienceLevel", project?.experience_level ?? "intermediate")} id="experienceLevel" name="experienceLevel" defaultValue={text("experienceLevel", project?.experience_level ?? "intermediate")}>
              {EXPERIENCE_LEVELS.map((x) => <option key={x} value={x}>{translate(m, `market.exp_${x}`)}</option>)}
            </Select>
          )}
        </Field>
        <Field id="city" label={mk.fCity} optionalLabel={m.common.optional}>
          {() => <CitySelect m={m} value={text("city", project?.city)} />}
        </Field>
      </div>
      <Field id="visibility" label={mk.fVisibility}>
        {() => (
          <Select key={text("visibility", project?.visibility ?? "public")} id="visibility" name="visibility" defaultValue={text("visibility", project?.visibility ?? "public")}>
            <option value="public">{mk.vis_public}</option>
            <option value="members">{mk.vis_members}</option>
          </Select>
        )}
      </Field>
      <div className="flex flex-wrap gap-3 border-t border-ink pt-6">
        {(!project || project.status === "draft") && (
          <SubmitButton name="intent" value="open" pendingLabel={m.common.saving}>{mk.publish}</SubmitButton>
        )}
        <SubmitButton name="intent" value="draft" variant={!project || project.status === "draft" ? "secondary" : "primary"} pendingLabel={m.common.saving}>
          {!project || project.status === "draft" ? mk.saveDraft : mk.saveChanges}
        </SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------------------------

export function ProposalForm({ locale, m, projectId, portfolio }: {
  locale: string;
  m: MarketMessages;
  projectId: string;
  portfolio: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(sendProposalAction, idleState);
  const t = useT(m);
  const fe = state.fieldErrors ?? {};
  const mk = m.market;
  if (state.status === "success") return <Alert tone="success">{t(state.message)}</Alert>;
  return (
    <form action={action} noValidate className="space-y-5">
      <Hidden name="locale" value={locale} />
      <Hidden name="projectId" value={projectId} />
      <Status state={state} m={m} />
      <Field id="coverLetter" label={mk.fCoverLetter} hint={mk.fCoverLetterHint} error={t(fe.coverLetter, { min: 50, max: 5000 })}>
        {(d, invalid) => <Textarea id="coverLetter" name="coverLetter" rows={7} required minLength={50} maxLength={5000} defaultValue={state.values?.coverLetter} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="bid" label={mk.fBid} error={t(fe.bid)}>
          {(d, invalid) => <Input id="bid" name="bid" inputMode="numeric" dir="ltr" required defaultValue={state.values?.bid} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
        <Field id="timelineDays" label={mk.fTimelineDays} error={t(fe.timelineDays)}>
          {(d, invalid) => <Input id="timelineDays" name="timelineDays" inputMode="numeric" dir="ltr" required defaultValue={state.values?.timelineDays} aria-describedby={d} aria-invalid={invalid} />}
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{mk.fAttach} <span className="font-normal text-ink-subtle">{m.common.optional}</span></legend>
        {portfolio.length === 0 ? (
          <p className="text-sm text-ink-subtle">{mk.attachNone}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {portfolio.slice(0, 12).map((p) => (
              <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[#bdb4a3] px-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input key={`${p.id}-${state.values?.portfolioItemIds ?? ""}`} type="checkbox" name="portfolioItemIds" value={p.id} defaultChecked={(state.values?.portfolioItemIds ?? "").split(",").includes(p.id)} className="size-4 accent-brand-600" />
                {p.title}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Field id="answers" label={mk.fAnswers} optionalLabel={m.common.optional} error={t(fe.answers, { max: 2000 })}>
        {(d, invalid) => <Textarea id="answers" name="answers" rows={3} maxLength={2000} defaultValue={state.values?.answers} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <SubmitButton size="lg" pendingLabel={m.common.loading}>{mk.sendProposal}</SubmitButton>
    </form>
  );
}
