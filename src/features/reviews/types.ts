import { z } from "zod";

export interface Review {
  id: string;
  productSlug: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}

/**
 * Validation schema, shared by the Server Action.
 *
 * Every message here is written to be shown to a user, because these strings
 * end up rendered under the field that produced them. "Invalid input" would be
 * useless at that point.
 */
export const reviewInputSchema = z.object({
  author: z
    .string()
    .trim()
    .min(2, "Please enter at least 2 characters.")
    .max(40, "That name is too long (40 characters max)."),
  rating: z.coerce
    .number()
    .int("Pick a whole number of stars.")
    .min(1, "Please choose a rating.")
    .max(5, "Ratings go up to 5."),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters.")
    .max(500, "That review is too long (500 characters max)."),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

/**
 * What the review action returns to `useActionState`.
 *
 * `fieldErrors` is keyed by field name so the form can render each message
 * beside its own input, and `values` echoes what the user typed so a failed
 * submit does not wipe the form.
 */
export type ReviewFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors: Partial<Record<keyof ReviewInput, string>>;
      values: { author: string; rating: string; body: string };
    };
