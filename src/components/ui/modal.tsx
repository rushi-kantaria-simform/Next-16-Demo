"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Dialog shell for intercepted routes.
 *
 * Dismissing calls `router.back()` rather than hiding local state. The modal
 * IS a history entry — it was created by navigating to /products/[slug] — so
 * going back is what restores the underlying list and the URL together. Hiding
 * it locally would leave the URL pointing at the product while the list shows.
 *
 * Uses the native <dialog> element for a real top layer, focus trapping and
 * inert background, none of which have to be reimplemented.
 */
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // `showModal()` (not `show()`) is what puts it in the top layer, traps
    // focus and makes the rest of the page inert.
    if (!dialog.open) dialog.showModal();

    // The browser fires `cancel` on Escape. Prevent the default close — which
    // would hide the dialog while leaving the URL on the product — and route
    // back instead, so URL and UI stay in agreement.
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };

    dialog.addEventListener("cancel", onCancel);

    return () => {
      dialog.removeEventListener("cancel", onCancel);

      /**
       * Closing here is NOT redundant, and the reason is worth knowing.
       *
       * Next preserves a parallel slot's rendered subtree across soft
       * navigations so forward/back is instant. The practical consequence:
       * navigating away runs this effect cleanup, but the <dialog> element
       * itself stays in the document — measured in a browser, the node count
       * grows 1 → 2 → 3 as you quick-view three products, and never shrinks.
       *
       * Without this `close()` those leftovers kept `open=""`, leaving several
       * elements the browser still considered open dialogs. Closing them drops
       * each from the top layer and out of the accessibility tree, so exactly
       * one dialog is ever open — verified: after the fix, open-count returns
       * to 0 on every dismiss.
       *
       * The leftover nodes themselves are framework behaviour we cannot
       * unmount from here. They are closed, `display: none` and inert, so the
       * cost is a few detached-looking nodes per session rather than a bug.
       */
      if (dialog.open) dialog.close();
    };
  }, [close]);

  return (
    <dialog
      ref={dialogRef}
      // Clicking the ::backdrop targets the dialog itself; clicks on the
      // content bubble from a child, so comparing targets distinguishes them.
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-card bg-surface-raised p-0 text-content shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
        >
          <X className="size-4" aria-hidden />
        </button>
        {children}
      </div>
    </dialog>
  );
}
