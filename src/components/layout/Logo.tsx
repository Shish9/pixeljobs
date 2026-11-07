import Link from "next/link";

/** Original PixelJobs wordmark, kept LTR in every language. */
export function Logo({ href }: { href: string }) {
  return (
    <Link href={href} dir="ltr" className="flex shrink-0 items-baseline rounded-sm font-[family-name:var(--font-jakarta)] text-[1.35rem] font-extrabold tracking-tight">
      <span className="text-ink">pixel</span>
      <span className="text-brand-600">jobs</span>
      <span className="sr-only"> — home</span>
    </Link>
  );
}
