"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrustMessages } from "./messages";
import { translate } from "@/i18n/translate";
import { idleState, type ActionState } from "@/lib/action-state";
import { reportAction, sendMessageAction, submitReviewAction } from "@/lib/actions/trust";
import { REPORT_REASONS } from "@/lib/validation";
import { Alert } from "@/components/ui/Alert";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";


const t = (m: TrustMessages, key?: string, vars?: Record<string, string | number>) =>
  key ? translate(m, key, { min: 10, max: 2000, ...vars }) : undefined;

function ErrorLine({ state, m }: { state: ActionState; m: TrustMessages }) {
  if (state.status !== "error") return null;
  if (state.message) return <Alert tone="danger">{t(m, state.message)}</Alert>;
  return <Alert tone="danger">{m.errors.checkFields}</Alert>;
}

/** Re-renders the server page every `seconds` while the tab is visible (light polling, no websockets). */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}

export function Composer({ locale, m, conversationId }: { locale: string; m: TrustMessages; conversationId: string }) {
  const [state, action] = useActionState(sendMessageAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      areaRef.current?.focus();
    }
  }, [state]);
  const fieldError = state.fieldErrors?.body;
  return (
    <form ref={formRef} action={action} noValidate className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conversationId" value={conversationId} />
      {state.status === "error" && state.message && <Alert tone="danger">{t(m, state.message)}</Alert>}
      <Field id="body" label={m.trust.composerLabel} hint={m.trust.composerHint} error={t(m, fieldError, { max: 4000 })}>
        {(d, invalid) => (
          <Textarea
            ref={areaRef}
            id="body"
            name="body"
            rows={3}
            required
            maxLength={4000}
            dir="auto"
            defaultValue={state.status === "error" ? state.values?.body : undefined}
            aria-describedby={d}
            aria-invalid={invalid}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
        )}
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel={m.common.loading}>{m.trust.send}</SubmitButton>
      </div>
    </form>
  );
}

export function ReviewForm({
  locale,
  m,
  requestId,
  proposalId,
  otherName,
}: {
  locale: string;
  m: TrustMessages;
  requestId?: string;
  proposalId?: string;
  otherName: string;
}) {
  const [state, action] = useActionState(submitReviewAction, idleState);
  const [open, setOpen] = useState(false);
  const fe = state.fieldErrors ?? {};
  if (state.status === "success") return <Alert tone="success">{t(m, state.message)}</Alert>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-600">
        {m.trust.leaveReview}
      </button>
    );
  }
  const rating = state.values?.rating ?? "";
  return (
    <form action={action} noValidate className="mt-2 space-y-4 border-s-[3px] border-brand-600 ps-4">
      <input type="hidden" name="locale" value={locale} />
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      {proposalId && <input type="hidden" name="proposalId" value={proposalId} />}
      <p className="font-bold">{translate(m, "trust.reviewFor", { name: otherName })}</p>
      <ErrorLine state={state} m={m} />
      <fieldset aria-describedby={fe.rating ? "rating-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold">{m.trust.ratingLabel}</legend>
        <div key={rating} className="flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[#bdb4a3] px-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
              <input type="radio" name="rating" value={n} defaultChecked={rating === String(n)} className="size-4 accent-brand-600" />
              <span aria-hidden="true" className="text-accent-600">{"★".repeat(n)}</span>
              <span>{translate(m, `trust.star_${n}`)}</span>
            </label>
          ))}
        </div>
        {fe.rating && <p id="rating-error" className="mt-2 text-sm font-semibold text-danger-700">{t(m, fe.rating)}</p>}
      </fieldset>
      <Field id="review-body" label={m.trust.reviewBody} hint={m.trust.reviewBodyHint} optionalLabel={m.common.optional} error={t(m, fe.body)}>
        {(d, invalid) => (
          <Textarea id="review-body" name="body" rows={4} maxLength={2000} dir="auto" defaultValue={state.values?.body} aria-describedby={d} aria-invalid={invalid} />
        )}
      </Field>
      <p className="text-sm text-ink-subtle">{m.trust.blindNote}</p>
      <SubmitButton pendingLabel={m.common.loading}>{m.trust.submitReview}</SubmitButton>
    </form>
  );
}

/** "Report" disclosure. Native <details> keeps it keyboard- and screen-reader-friendly without extra state. */
export function ReportButton({
  locale,
  m,
  targetType,
  targetId,
  compact = false,
}: {
  locale: string;
  m: TrustMessages;
  targetType: string;
  targetId: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(reportAction, idleState);
  const fe = state.fieldErrors ?? {};
  const id = `report-${targetType}-${targetId.slice(0, 8)}`;
  return (
    <details className="group text-sm">
      <summary className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-ink-subtle underline-offset-4 hover:text-ink hover:underline ${compact ? "min-h-9 text-xs" : ""}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="M4 22V4m0 0h12l-2 4 2 4H4" /></svg>
        {m.trust.report}
      </summary>
      <div className="mt-2 w-full max-w-sm border border-ink bg-paper p-4 text-base">
        {state.status === "success" ? (
          <Alert tone="success">{t(m, state.message)}</Alert>
        ) : (
          <form action={action} noValidate className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <p className="font-bold">{m.trust.reportTitle}</p>
            <ErrorLine state={state} m={m} />
            <Field id={`${id}-reason`} label={m.trust.reportReason} error={t(m, fe.reason)}>
              {(d, invalid) => (
                <Select key={state.values?.reason ?? ""} id={`${id}-reason`} name="reason" required defaultValue={state.values?.reason ?? ""} aria-describedby={d} aria-invalid={invalid}>
                  <option value="" disabled>{m.trust.reportReason}</option>
                  {REPORT_REASONS.map((r) => <option key={r} value={r}>{translate(m, `trust.reason_${r}`)}</option>)}
                </Select>
              )}
            </Field>
            <Field id={`${id}-details`} label={m.trust.reportDetails} hint={m.trust.reportDetailsHint} optionalLabel={m.common.optional} error={t(m, fe.details, { max: 1000 })}>
              {(d, invalid) => <Textarea id={`${id}-details`} name="details" rows={3} maxLength={1000} dir="auto" defaultValue={state.values?.details} aria-describedby={d} aria-invalid={invalid} />}
            </Field>
            <SubmitButton variant="danger" pendingLabel={m.common.loading}>{m.trust.sendReport}</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
