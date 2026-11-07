import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { getJob } from "@/lib/jobs";
import { htmlToBlocks, safeExternalUrl } from "@/lib/text";
import { buttonClasses } from "@/components/ui/Button";
import { Badge, Card, Container } from "@/components/ui/Card";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[lang]/jobs/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const job = await getJob(slug);
  if (!job) return {};
  return { title: `${job.job_title} — ${job.company_name}` };
}

export default async function JobPage({ params }: PageProps<"/[lang]/jobs/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, job, fmt] = await Promise.all([getDictionary(lang), getJob(slug), getFormatters(lang)]);
  if (!job) notFound();

  const blocks = htmlToBlocks(job.job_description);
  const applyUrl = safeExternalUrl(job.apply_url);

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <Link href={`/${lang}/jobs`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {dict.jobs.back}
      </Link>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_280px]">
        <article dir="auto">
          <p className="text-ink-subtle">{job.company_name}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{job.job_title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{job.role_category}</Badge>
            <Badge>{job.job_type}</Badge>
            <Badge tone="success">{job.remote_policy}</Badge>
            {job.location && <Badge>{job.location}</Badge>}
            {job.salary_range && <Badge tone="warning">{job.salary_range}</Badge>}
          </div>
          <div className="mt-8 space-y-3 leading-relaxed text-ink-muted">
            {blocks.map((b, i) =>
              b.type === "li" ? (
                <p key={i} className="ps-5 before:-ms-4 before:me-2 before:content-['•']">{b.text}</p>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </div>
        </article>
        <aside>
          <Card className="sticky top-24 p-5">
            <p className="text-sm text-ink-subtle">{interpolate(dict.jobs.posted, { date: fmt.date(job.published_date) })}</p>
            {applyUrl && (
              <a href={applyUrl} target="_blank" rel="noopener noreferrer nofollow" className={buttonClasses("primary", "md", "mt-4 w-full")}>
                {dict.jobs.apply} <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
            <p className="mt-3 text-xs text-ink-subtle">{dict.jobs.applyNote}</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
