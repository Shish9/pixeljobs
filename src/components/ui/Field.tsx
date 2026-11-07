import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border border-[#bdb4a3] bg-surface px-3 text-base text-ink placeholder:text-ink-subtle " +
  "transition-colors hover:border-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 " +
  "aria-[invalid=true]:border-danger-700 aria-[invalid=true]:focus:ring-danger-50 disabled:bg-sunken";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

/** Label + control + hint + error, wired together with aria-describedby / aria-invalid. */
export function Field({ id, label, hint, error, optionalLabel, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        <span>{label}</span>
        {optionalLabel && <span className="text-xs font-normal text-ink-subtle">{optionalLabel}</span>}
      </label>
      {children(describedBy, Boolean(error))}
      {hint && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 pe-8", className)} {...props} />;
}

/** Large tappable checkbox card used for choices like "I want to hire / I want to work". */
export function ChoiceCard({
  name,
  value,
  defaultChecked,
  title,
  description,
  type = "checkbox",
}: {
  name: string;
  value?: string;
  defaultChecked?: boolean;
  title: string;
  description?: string;
  type?: "checkbox" | "radio";
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md border border-[#bdb4a3] bg-surface p-4 transition-colors hover:border-ink has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-brand-600 focus-visible:outline-none"
      />
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}
