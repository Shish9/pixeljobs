import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
  dark: "bg-ink text-white hover:bg-[#2b2a26] active:bg-black",
  secondary: "border border-ink bg-transparent text-ink hover:bg-sunken active:bg-line",
  ghost: "text-ink-muted hover:bg-sunken hover:text-ink",
  danger: "bg-danger-700 text-white hover:bg-[#912018]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
