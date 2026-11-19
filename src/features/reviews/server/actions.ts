"use server";

import { updateTag } from "next/cache";

import {
  reviewInputSchema,
  type ReviewFormState,
  type ReviewInput,
} from "../types";
import { addReview } from "./review-store";

const REVIEW_FIELDS = ["author", "rating", "body"] as const;

/**
 * `issue.path[0]` is typed `PropertyKey | undefined`, so narrow it to a real
 * field name before using it as an index. A `as keyof ReviewInput` cast would
 * compile but would silently accept a nested path from a future schema change.
 */
function isReviewField(value: unknown): value is keyof ReviewInput {
  return (
    typeof value === "string" &&
    (REVIEW_FIELDS as readonly string[]).includes(value)
  );
}

/**
 * Review submission — the full mutation pipeline in one function:
 * validate → write → invalidate → return state for the UI.
 *
 * The slug is BOUND, not submitted. The component calls
 * `submitReview.bind(null, slug)`, so it arrives as a real argument that the
 * client cannot alter. A hidden <input name="slug"> would be editable in
 * devtools, and since a Server Action is a public endpoint, that matters.
 */
export async function submitReview(
  productSlug: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const raw = {
    author: String(formData.get("author") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    body: String(formData.get("body") ?? ""),
  };

  const parsed = reviewInputSchema.safeParse(raw);

  if (!parsed.success) {
    // Returned, not thrown. A thrown error would escape to error.tsx and
    // replace the page; a validation failure should land inline on the field.
    const fieldErrors: Partial<Record<keyof ReviewInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      // First message per field wins — showing three errors on one input is
      // noise, and zod reports them in declaration order.
      if (isReviewField(field) && !(field in fieldErrors)) {
        fieldErrors[field] = issue.message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
      // Echo the input back so a failed submit does not clear the textarea.
      values: raw,
    };
  }

  const { author, rating, body } = parsed.data;

  addReview({
    // `crypto.randomUUID()` is safe HERE but would fail inside a prerendered
    // Server Component with `blocking-prerender-random` — a Server Action
    // only ever runs at request time, so there is no prerender to poison.
    id: crypto.randomUUID(),
    productSlug,
    author,
    rating,
    body,
    createdAt: new Date().toISOString(),
  });

  // Immediate expiry so the author sees their own review on the very next
  // render. `revalidateTag(tag, "max")` would serve the old list once more —
  // acceptable for a catalogue, not for the thing you just submitted.
  updateTag(`reviews:${productSlug}`);

  return { status: "success", message: "Thanks — your review is live." };
}
