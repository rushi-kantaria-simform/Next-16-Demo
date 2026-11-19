import "server-only";

import type { Review } from "../types";

/**
 * In-memory review store.
 *
 * HONEST LIMITATION — read this before copying the pattern:
 * this is a module-level array. It resets on every server restart, and in a
 * multi-instance or serverless deployment each instance keeps its OWN copy, so
 * a review written on instance A is invisible on instance B.
 *
 * It exists because the point of Topic 6 is the mutation pipeline — validate,
 * write, invalidate, re-render — not the persistence layer. The cart, by
 * contrast, uses a cookie and genuinely survives both restarts and instances.
 *
 * Swapping this for a real database means changing this file only; the actions
 * and components above it are unaffected. That is the payoff of keeping the
 * data layer behind a module boundary.
 */

const reviews = new Map<string, Review[]>();

const seedReviews: Record<string, Review[]> = {
  "aurora-over-ear-headphones": [
    {
      id: "rev_seed_1",
      productSlug: "aurora-over-ear-headphones",
      author: "Priya",
      rating: 5,
      body: "The noise cancelling is genuinely good on a train. Battery easily lasts a week of commuting.",
      createdAt: "2026-10-02T09:12:00.000Z",
    },
    {
      id: "rev_seed_2",
      productSlug: "aurora-over-ear-headphones",
      author: "Daniel",
      rating: 4,
      body: "Comfortable for long sessions. Wish the case were a bit smaller.",
      createdAt: "2026-10-14T16:40:00.000Z",
    },
  ],
  "tactile-75-mechanical-keyboard": [
    {
      id: "rev_seed_3",
      productSlug: "tactile-75-mechanical-keyboard",
      author: "Sam",
      rating: 5,
      body: "Sounds superb out of the box and the hot-swap sockets feel solid.",
      createdAt: "2026-11-01T11:05:00.000Z",
    },
  ],
};

function ensureSeeded(slug: string): Review[] {
  if (!reviews.has(slug)) {
    reviews.set(slug, [...(seedReviews[slug] ?? [])]);
  }
  return reviews.get(slug) ?? [];
}

export function listReviews(slug: string): Review[] {
  // Newest first.
  return [...ensureSeeded(slug)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function addReview(review: Review): void {
  const existing = ensureSeeded(review.productSlug);
  existing.push(review);
  reviews.set(review.productSlug, existing);
}

export function reviewStats(slug: string): {
  count: number;
  average: number;
} {
  const list = ensureSeeded(slug);
  if (list.length === 0) return { count: 0, average: 0 };

  const total = list.reduce((sum, review) => sum + review.rating, 0);
  return {
    count: list.length,
    average: Math.round((total / list.length) * 10) / 10,
  };
}
