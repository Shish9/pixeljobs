import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getFormatters } from "@/i18n/format-server";
import { interpolate } from "@/i18n/translate";
import { listJobs } from "@/lib/jobs";
import { Alert } from "@/components/ui/Alert";
import { Badge, Card, Container, EmptyState } from "@/components/ui/Card";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[lang]/jobs">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.jobs.title, description: dict.jobs.subtitle, alternates: { canonical: `/${lang}/jobs` } };
}

export default async function JobsPage({ params }: PageProps<"/[lang]/jobs">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, jobs, fmt] = await Promise.all([getDictionary(lang), listJobs(), getFormatters(lang)]);

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">{dict.jobs.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{dict.jobs.subtitle}</p>
      <Alert className="mt-6">{dict.jobs.archiveNote}</Alert>

      <p className="mt-8 text-sm text-ink-subtle" aria-live="polite">
        {interpolate(dict.jobs.results, { count: fmt.number(jobs.length) })}
      </p>
      {jobs.length === 0 ? (
        <div className="mt-4"><EmptyState title={dict.jobs.empty} /></div>
      ) : (
        <ul className="mt-4 space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Card className="transition-colors hover:border-line-strong">
                <Link href={`/${lang}/jobs/${job.slug}`} className="block p-5" dir="auto">
                  <p className="text-sm text-ink-subtle">{job.company_name}</p>
                  <h2 className="mt-0.5 font-semibold">{job.job_title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge>{job.role_category}</Badge>
                    <Badge>{job.job_type}</Badge>
                    <Badge tone="success">{job.remote_policy}</Badge>
                    {job.location && <span className="inline-flex items-center gap-1 text-ink-subtle"><MapPin className="size-3.5" aria-hidden="true" />{job.location}</span>}
                    <span className="ms-auto text-ink-subtle">{interpolate(dict.jobs.posted, { date: fmt.date(job.published_date) })}</span>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
