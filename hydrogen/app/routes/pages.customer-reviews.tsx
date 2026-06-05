import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { ShieldCheck, Star, PenLine, User } from "lucide-react";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Customer Reviews — MLS UAE" },
  { name: "description", content: "Read genuine customer reviews for MLS UAE. Over 7000 verified buyers share their experience." },
];

interface ParsedReview {
  id: string;
  rating: number;
  author: string;
  date: string;
  title: string;
  body: string;
  product: string;
  verified: boolean;
}

function parseReviews(html: string): ParsedReview[] {
  const reviews: ParsedReview[] = [];
  const parts = html.split(/(?=<div class='jdgm-rev jdgm-divider)/);
  for (const part of parts) {
    if (!part.includes("data-review-id")) continue;
    const id      = part.match(/data-review-id='([^']+)'/)?.[1] ?? "";
    const verified= part.match(/data-verified-buyer='([^']+)'/)?.[1] === "true";
    const rating  = parseInt(part.match(/data-score='(\d+)'/)?.[1] ?? "5");
    const author  = part.match(/class='jdgm-rev__author'[^>]*>([^<]+)/)?.[1]?.trim() ?? "";
    const date    = part.match(/data-created-at='([^']+)'/)?.[1] ?? "";
    const title   = part.match(/class='jdgm-rev__title'[^>]*>([^<]+)/)?.[1]?.trim() ?? "";
    const body    = part.match(/class='jdgm-rev__content'[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    const product = part.match(/class='jdgm-rev__product-title'[^>]*>([^<]+)/)?.[1]?.replace(/^about\s+/i, "").trim() ?? "";
    if (!id) continue;
    reviews.push({ id, rating, author, date, title, body, product, verified });
  }
  return reviews;
}

function parseHistogram(headerHtml: string): [number, number, number, number, number] {
  const counts = headerHtml.match(/\((\d+)\)/g)?.map(m => parseInt(m.replace(/[()]/g, ""))) ?? [];
  const h: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  if (counts.length >= 5) {
    h[4] = counts[0]; h[3] = counts[1]; h[2] = counts[2]; h[1] = counts[3]; h[0] = counts[4];
  }
  return h;
}

const METAFIELD_QUERY = `{
  shop {
    header:   metafield(namespace: "judgeme", key: "all_reviews_header") { value }
    reviews0: metafield(namespace: "judgeme", key: "all_reviews_0")      { value }
    reviews1: metafield(namespace: "judgeme", key: "all_reviews_1")      { value }
    count:    metafield(namespace: "judgeme", key: "all_reviews_count")  { value }
    rating:   metafield(namespace: "judgeme", key: "all_reviews_rating") { value }
  }
}`;

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(METAFIELD_QUERY);
  const shop = data?.shop ?? {};

  const header    = shop.header?.value ?? "";
  const reviews0  = shop.reviews0?.value ?? "";
  const reviews1  = shop.reviews1?.value ?? "";
  const count     = Number(shop.count?.value ?? 0);
  const rating    = Number(shop.rating?.value ?? 0);
  const histogram = parseHistogram(header);
  const reviews   = parseReviews(reviews0 + reviews1);

  return { reviews, count, rating, histogram };
}

export default function CustomerReviewsPage() {
  const { reviews, count, rating, histogram } = useLoaderData<typeof loader>();

  const starLabels = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"];
  const histTotal = histogram.reduce((s, n) => s + n, 0);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div
        className="relative overflow-hidden py-20 md:py-28"
        style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #1a0a0a 100%)" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto px-4 text-center text-white">
          <span className="mb-4 inline-block rounded-full border border-crimson/40 bg-crimson/20 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Verified Reviews
          </span>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">
            Take our customers' words<br className="hidden md:block" /> for our products
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            {count.toLocaleString()} verified buyers share their honest experience
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-14">

        {/* Rating Summary */}
        {count > 0 && (
          <div className="mb-12 flex flex-col items-center gap-8 rounded-2xl border border-border bg-card p-8 shadow-sm sm:flex-row sm:items-start sm:justify-between">

            {/* Score */}
            <div className="flex shrink-0 flex-col items-center gap-2 text-center">
              <span className="font-display text-6xl font-extrabold tabular-nums text-foreground">{rating.toFixed(2)}</span>
              <StarRow rating={rating} size="lg" />
              <span className="text-sm text-muted-foreground">Based on {count.toLocaleString()} reviews</span>
            </div>

            {/* Histogram */}
            <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-1 sm:px-8">
              {[4, 3, 2, 1, 0].map((idx) => {
                const pct = histTotal > 0 ? Math.round((histogram[idx] / histTotal) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 text-right text-muted-foreground">{starLabels[idx]}</span>
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
                      {pct}% ({histogram[idx].toLocaleString()})
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="flex shrink-0 flex-col items-center gap-3">
              <a
                href="https://judge.me/stores/mls-uae.myshopify.com/reviews/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-300"
              >
                <PenLine className="h-4 w-4" />
                Write a Review
              </a>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified by Judge.me
              </span>
            </div>
          </div>
        )}

        {/* Reviews Grid */}
        {reviews.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No reviews found.</p>
        )}
      </div>
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: ParsedReview }) {
  const initials = review.author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const dateStr = review.date
    ? new Date(review.date).toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson/10 text-sm font-bold text-crimson">
            {initials || <User className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{review.author}</p>
            {dateStr && <p className="text-xs text-muted-foreground">{dateStr}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StarRow rating={review.rating} size="sm" />
          {review.verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Product */}
      {review.product && (
        <p className="text-[11px] font-medium text-crimson/80 uppercase tracking-wide truncate">
          {review.product}
        </p>
      )}

      {/* Review content */}
      {review.title && <p className="text-sm font-semibold">{review.title}</p>}
      {review.body && <p className="text-sm leading-relaxed text-muted-foreground">{review.body}</p>}
    </div>
  );
}

// ── Star Row ──────────────────────────────────────────────────────────────────

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(sz, i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")}
        />
      ))}
    </div>
  );
}
