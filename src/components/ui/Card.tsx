import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-line bg-surface", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "brand" | "price" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-sunken text-ink-muted",
    brand: "bg-brand-50 text-brand-700",
    price: "bg-accent-200 text-ink font-extrabold",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    danger: "bg-danger-50 text-danger-700",
  } as const;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="h-2 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="border-y border-ink px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
