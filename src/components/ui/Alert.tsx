import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-info-700/20 bg-info-50 text-info-700", Icon: Info },
  success: { box: "border-success-700/20 bg-success-50 text-success-700", Icon: CheckCircle2 },
  warning: { box: "border-warning-700/20 bg-warning-50 text-warning-700", Icon: TriangleAlert },
  danger: { box: "border-danger-700/20 bg-danger-50 text-danger-700", Icon: AlertCircle },
};

/** Status message. Errors use role="alert" (assertive), everything else role="status" (polite). */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-3.5 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-muted [&_a]:font-semibold [&_a]:underline">{children}</div>}
      </div>
    </div>
  );
}
