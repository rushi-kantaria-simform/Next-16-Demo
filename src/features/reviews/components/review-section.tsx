import { cacheLife, cacheTag } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { listReviews, reviewStats } from "../server/review-store";
import { ReviewForm } from "./review-form";

/**
 * Reviews for one product.
 *
 * `"use cache"` — plain, not `private`. The review list is identical for every
 * visitor, so one shared cache entry is correct. Contrast the cart badge,
 * which reads cookies and therefore must be `"use cache: private"`.
 *
 * `cacheTag(\`reviews:${slug}\`)` is scoped PER PRODUCT. Posting a review on
 * the headphones calls `updateTag("reviews:aurora-over-ear-headphones")` and
 * leaves every other product's cached list untouched. A single blanket
 * `"reviews"` tag would throw away the whole catalogue's reviews on each write.
 *
 * `cacheLife("max")` because the only thing that changes this data is a write,
 * and that write invalidates by tag. Time-based expiry would just add
 * pointless recomputation.
 */
export async function ReviewSection({ productSlug }: { productSlug: string }) {
  "use cache";
  cacheLife("max");
  cacheTag(`reviews:${productSlug}`);

  const reviews = listReviews(productSlug);
  const stats = reviewStats(productSlug);

  return (
    <section className="border-t border-line pt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-content">
          Reviews
        </h2>
        {stats.count > 0 && (
          <Badge tone="neutral">
            {stats.average.toFixed(1)} ★ · {stats.count}
          </Badge>
        )}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-content">
            {reviews.length === 0 ? "No reviews yet" : "What people say"}
          </h3>

          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-content-muted">
              Be the first to review this product.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="border-b border-line pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-content">
                      {review.author}
                    </span>
                    <span className="text-xs text-content-muted">
                      {"★".repeat(review.rating)}
                      <span className="opacity-30">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-content-muted">
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-content">Write a review</h3>
          <div className="mt-4">
            {/* Client Component, receiving one string from a Server Component. */}
            <ReviewForm productSlug={productSlug} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReviewSectionSkeleton() {
  return (
    <section className="border-t border-line pt-10">
      <div className="h-8 w-32 animate-pulse rounded bg-surface-muted" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex animate-pulse flex-col gap-2">
              <div className="h-4 w-24 rounded bg-surface-muted" />
              <div className="h-3 w-full rounded bg-surface-muted" />
              <div className="h-3 w-4/5 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </section>
  );
}
