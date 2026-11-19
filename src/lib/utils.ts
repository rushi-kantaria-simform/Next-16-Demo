import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with correct conflict resolution.
 *
 * `clsx` handles conditionals and falsy values; `twMerge` then resolves
 * competing utilities so the LAST one wins:
 *
 *   cn("px-2 py-1", "px-4")        // -> "py-1 px-4"   (not "px-2 px-4")
 *   cn("text-sm", isLarge && "text-lg")
 *
 * Without twMerge, both classes land in the DOM and the winner depends on
 * stylesheet order rather than call order — which breaks component overrides.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a minor-unit integer (cents) as currency. */
export function formatPrice(
  amountInCents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

/** `sleep(300)` — used by the data layer to make streaming observable in dev. */
export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "Wireless Headphones" -> "wireless-headphones" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
