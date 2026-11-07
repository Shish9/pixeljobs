import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AuthMessages } from "./AuthForms";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
    </div>
  );
}

export function pickAuthMessages(d: Dictionary): AuthMessages {
  return { auth: d.auth, errors: d.errors, validation: d.validation, common: d.common };
}
