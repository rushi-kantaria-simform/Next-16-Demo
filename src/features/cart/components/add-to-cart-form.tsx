"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCart } from "../server/actions";
import type { ActionResult } from "../types";

const initialState: ActionResult = { status: "idle" };

interface AddToCartFormProps {
  slug: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Add-to-cart form.
 *
 * `useActionState(action, initialState)` returns `[state, formAction, pending]`:
 *   state      whatever the action last RETURNED (our ActionResult)
 *   formAction a wrapped action to hand to <form action={...}>
 *   pending    true while in flight — no manual loading flag needed
 *
 * Note the third element. Plenty of code still pairs `useActionState` with a
 * separate `useTransition` for pending state; since React 19 that is redundant.
 *
 * Why a <form> at all rather than an onClick handler: the form POSTs to the
 * action and works before hydration — and with JavaScript disabled entirely.
 * An onClick does neither.
 */
export function AddToCartForm({
  slug,
  disabled = false,
  label = "Add to cart",
}: AddToCartFormProps) {
  const [state, formAction, pending] = useActionState(addToCart, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/*
        The slug travels as a hidden field, and the action re-validates it
        against the catalogue. Treat it as a hint, never as authority — anyone
        can edit a hidden input, and the action is a public endpoint.
      */}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="quantity" value="1" />

      <SubmitButton disabled={disabled} label={label} />

      {/* aria-live so screen readers announce the result without a focus move. */}
      <p aria-live="polite" className="min-h-5 text-xs">
        {state.status === "error" && (
          <span className="text-red-600 dark:text-red-400">
            {state.message}
          </span>
        )}
        {state.status === "success" && !pending && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" aria-hidden />
            {state.message}
          </span>
        )}
      </p>
    </form>
  );
}

/**
 * `useFormStatus` must live in a CHILD of the <form>, not alongside it.
 * Called in the same component that renders the form, it returns
 * `pending: false` forever — it reads the nearest form ABOVE it in the tree.
 *
 * Here it is arguably redundant (useActionState already gives `pending`), but
 * it is the right tool when a deeply nested button has no access to that
 * state and you do not want to prop-drill it.
 */
function SubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <ShoppingCart className="size-4" aria-hidden />
      )}
      {pending ? "Adding…" : label}
    </Button>
  );
}

/*
 * A note on what was removed here.
 *
 * This file originally auto-hid the confirmation after 3 seconds, which
 * required a `useState` + `useEffect` pair. ESLint flagged it with
 * `react-hooks/set-state-in-effect`, correctly: calling setState in an effect
 * body forces a second render pass immediately after the first.
 *
 * The obvious repairs were worse than the feature. Resetting the timer per
 * submit needs a changing `key`, but the action returns the same message for
 * the same product, and deriving a key by mutating a ref during render is an
 * impure render that bumps on every re-render, not every submit.
 *
 * So the timer is gone. The message simply persists until the next submit
 * replaces it — fewer moving parts, no lint suppression, and the result is
 * arguably better: a confirmation that vanishes on its own is easy to miss.
 */
