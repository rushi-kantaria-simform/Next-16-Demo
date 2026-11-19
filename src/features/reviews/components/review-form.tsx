"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitReview } from "../server/actions";
import type { ReviewFormState } from "../types";

const initialState: ReviewFormState = { status: "idle" };

/**
 * Review form — server-side validation surfaced inline.
 *
 * The flow worth understanding: this form has NO client-side validation
 * beyond `required`. The action is the single source of truth, which means
 * the rules cannot drift between client and server, and a user with
 * JavaScript disabled gets exactly the same enforcement.
 *
 * `useActionState(action, initialState)` → `[state, formAction, pending]`.
 * `state` is whatever the action returned, so field errors, the summary
 * message and the echoed values all arrive through one channel.
 */
export function ReviewForm({ productSlug }: { productSlug: string }) {
  // `.bind` pre-applies productSlug server-side, giving the action signature
  // (prevState, formData) that useActionState expects. The slug never appears
  // in the DOM, so it cannot be swapped for another product's.
  const boundAction = submitReview.bind(null, productSlug);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          name="author"
          error={errors.author}
          defaultValue={values?.author}
        >
          {(props) => <input type="text" maxLength={40} {...props} />}
        </Field>

        <Field
          label="Rating"
          name="rating"
          error={errors.rating}
          defaultValue={values?.rating}
        >
          {(props) => (
            <select {...props}>
              <option value="">Choose…</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        label="Your review"
        name="body"
        error={errors.body}
        defaultValue={values?.body}
      >
        {(props) => <textarea rows={4} maxLength={500} {...props} />}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post review"}
        </Button>

        {/* aria-live announces the outcome without stealing focus. */}
        <p aria-live="polite" className="text-sm">
          {state.status === "error" && (
            <span className="text-red-600 dark:text-red-400">
              {state.message}
            </span>
          )}
          {state.status === "success" && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {state.message}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

/**
 * Render-prop field wrapper, so label/error/aria wiring is written once.
 *
 * `aria-invalid` and `aria-describedby` are the parts people skip: without
 * them a screen reader announces the input but never the error text sitting
 * next to it.
 */
function Field({
  label,
  name,
  error,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
  children: (props: {
    id: string;
    name: string;
    defaultValue?: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
}) {
  const id = `review-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-content">
        {label}
      </label>

      {children({
        id,
        name,
        defaultValue,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
        className: cn(
          "rounded-lg border bg-surface-raised px-3 py-2 text-sm text-content",
          error ? "border-red-500" : "border-line",
        ),
      })}

      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
