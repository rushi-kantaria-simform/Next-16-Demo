"use client";

import { useOptimistic, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { cn, formatPrice } from "@/lib/utils";
import { removeFromCart, updateCartItem } from "../server/actions";
import type { CartSummary } from "../types";

/**
 * Cart lines with OPTIMISTIC quantity updates.
 *
 * The problem: every quantity change is a server round-trip (write the cookie,
 * expire the cache, re-render). Even at 50ms the arrows feel laggy, and users
 * click them repeatedly.
 *
 * `useOptimistic(actualState, reducer)` gives a provisional state that React
 * shows IMMEDIATELY, then discards once the real server state arrives. If the
 * action fails, the optimistic value is dropped and the true state reappears —
 * no manual rollback.
 *
 * The rule that makes it work: the optimistic update MUST be dispatched inside
 * a transition. Call it outside one and React throws
 * "An optimistic state update occurred outside a transition".
 */
export function CartLines({ cart }: { cart: CartSummary }) {
  const [isPending, startTransition] = useTransition();

  const [optimisticCart, applyOptimistic] = useOptimistic(
    cart,
    (current: CartSummary, update: { slug: string; quantity: number }) => {
      const lines = current.lines
        .map((line) =>
          line.slug === update.slug
            ? {
                ...line,
                quantity: update.quantity,
                // Recompute the line total too, otherwise the row shows a new
                // quantity against the old price for one frame.
                lineTotalInCents: line.priceInCents * update.quantity,
              }
            : line,
        )
        .filter((line) => line.quantity > 0);

      return {
        ...current,
        lines,
        itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        subtotalInCents: lines.reduce(
          (sum, line) => sum + line.lineTotalInCents,
          0,
        ),
      };
    },
  );

  function changeQuantity(slug: string, quantity: number) {
    startTransition(async () => {
      applyOptimistic({ slug, quantity });

      const formData = new FormData();
      formData.set("slug", slug);
      formData.set("quantity", String(quantity));
      // The action signature is (prevState, formData) because it is shared
      // with useActionState elsewhere; pass a throwaway previous state.
      await updateCartItem({ status: "idle" }, formData);
    });
  }

  function remove(slug: string) {
    startTransition(async () => {
      applyOptimistic({ slug, quantity: 0 });
      // `.bind` pre-applies the slug server-side. Compare the hidden <input>
      // in add-to-cart-form: a bound argument cannot be edited in devtools.
      await removeFromCart.bind(null, slug)();
    });
  }

  if (optimisticCart.lines.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line py-16 text-center">
        <p className="font-medium text-content">Your cart is empty</p>
        <Link
          href="/products"
          className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          Browse the catalogue →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-3 transition-opacity", {
        // Dim rather than disable: the optimistic value is already on screen,
        // so the UI stays interactive while the server catches up.
        "opacity-70": isPending,
      })}
    >
      {optimisticCart.lines.map((line) => (
        <div
          key={line.slug}
          className="flex items-center gap-4 rounded-card border border-line p-3"
        >
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
            <Image
              src={line.imageUrl}
              alt={line.imageAlt}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/products/${line.slug}`}
              className="truncate text-sm font-medium text-content hover:underline"
            >
              {line.name}
            </Link>
            <p className="mt-0.5 text-xs text-content-muted">
              {formatPrice(line.priceInCents, line.currency)} each
            </p>
            {!line.inStock && (
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                Out of stock
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <QuantityButton
              label={`Decrease quantity of ${line.name}`}
              onClick={() => changeQuantity(line.slug, line.quantity - 1)}
            >
              <Minus className="size-3" aria-hidden />
            </QuantityButton>

            <span className="w-8 text-center text-sm font-medium text-content tabular-nums">
              {line.quantity}
            </span>

            <QuantityButton
              label={`Increase quantity of ${line.name}`}
              disabled={line.quantity >= 99}
              onClick={() => changeQuantity(line.slug, line.quantity + 1)}
            >
              <Plus className="size-3" aria-hidden />
            </QuantityButton>
          </div>

          <span className="w-20 text-right text-sm font-semibold text-content tabular-nums">
            {formatPrice(line.lineTotalInCents, line.currency)}
          </span>

          <QuantityButton
            label={`Remove ${line.name}`}
            onClick={() => remove(line.slug)}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </QuantityButton>
        </div>
      ))}

      <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm text-content-muted">
          {optimisticCart.itemCount}{" "}
          {optimisticCart.itemCount === 1 ? "item" : "items"}
        </span>
        <span className="text-lg font-semibold text-content tabular-nums">
          {formatPrice(optimisticCart.subtotalInCents, optimisticCart.currency)}
        </span>
      </div>
    </div>
  );
}

function QuantityButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-7 items-center justify-center rounded border border-line text-content-muted transition-colors hover:bg-surface-muted hover:text-content disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
