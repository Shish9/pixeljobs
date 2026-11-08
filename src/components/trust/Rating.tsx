import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { interpolate } from "@/i18n/translate";
import type { PublicReview, Rating } from "@/lib/trust";
import { Person } from "@/components/market/parts";
import { ReportButton } from "./TrustForms";
import { type TrustMessages } from "@/components/trust/messages";

type Fmt = { number: (n: number, o?: Intl.NumberFormatOptions) => string; date: (d: string) => string };

const one = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

/** "★ 4.8 (12)" with a full sentence for screen readers. Renders nothing without reviews unless `showEmpty`. */
export function RatingInline({ rating, dict, fmt, showEmpty = false }: { rating: Rating | null | undefined; dict: Dictionary; fmt: Fmt; showEmpty?: boolean }) {
  const tr = dict.trust;
  if (!rating || rating.count === 0) return showEmpty ? <span className="text-sm text-ink-subtle">{tr.noRating}</span> : null;
  const avg = fmt.number(rating.avg, one);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden="true" className="text-accent-600">★</span>
      <span aria-hidden="true" className="font-bold">{avg}</span>
      <span aria-hidden="true" className="text-ink-subtle">({fmt.number(rating.count)})</span>
      <span className="sr-only">{interpolate(tr.ratingOutOf, { avg })} · {interpolate(tr.reviewsCount, { count: fmt.number(rating.count) })}</span>
    </span>
  );
}

export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="tracking-tight text-accent-600">
      {"★".repeat(value)}<span className="text-line">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** `reportM` is passed only for signed-in visitors, who may report a review. */
export function ReviewList({ reviews, dict, fmt, locale, reportM, viewerId }: {
  reviews: PublicReview[];
  dict: Dictionary;
  fmt: Fmt;
  locale: Locale;
  reportM?: TrustMessages;
  viewerId?: string;
}) {
  const tr = dict.trust;
  if (reviews.length === 0) return <p className="text-ink-subtle">{tr.reviewsEmpty}</p>;
  return (
    <ul className="border-t border-ink">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-line py-5">
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={r.rating} label={interpolate(tr.ratingOutOf, { avg: fmt.number(r.rating) })} />
            <span className="text-sm text-ink-subtle">{r.reviewer_role === "client" ? tr.byClient : tr.byFreelancer} · {fmt.date(r.created_at)}</span>
          </div>
          {r.body && <p className="mt-2 whitespace-pre-line" dir="auto">{r.body}</p>}
          <div className="mt-2 flex items-center gap-2 text-sm text-ink-subtle">
            <Person person={r.reviewer} fallback="?" size="sm" />
            <span>{r.reviewer?.display_name || (r.reviewer_role === "client" ? tr.clientLabel : tr.freelancerLabel)}</span>
          </div>
          {reportM && viewerId !== r.reviewer_id && <ReportButton locale={locale} m={reportM} targetType="review" targetId={r.id} compact />}
        </li>
      ))}
    </ul>
  );
}
