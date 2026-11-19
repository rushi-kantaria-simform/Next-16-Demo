import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect } from "@playwright/test";
import { instant } from "@next/playwright";

/**
 * Static-shell regression tests.
 *
 * The architecture of Topics 1–11 rests on one claim: "the shell is static,
 * only X streams". That claim is invisible to `tsc`, invisible to lint, and
 * broken by moving a single `await` above a <Suspense> boundary. These tests
 * let CI fail on it.
 *
 * TWO TOOLS, TWO GUARANTEES. Getting this split wrong cost two drafts:
 *
 *   instant()        asserts shell UI REACHES THE BROWSER on navigation.
 *   shell inspection asserts the exact bytes Next prerendered at build time.
 *
 * The first draft expressed "not in the shell" as
 * `expect(streamed).toHaveCount(0)` inside `instant()`. All three failed —
 * not because the shells were wrong, but because this app's dynamic sections
 * resolve from in-memory data in single-digit milliseconds, so the streamed
 * HTML arrived inside Playwright's assertion window. That assertion races the
 * network: flaky, not meaningful.
 *
 * The second draft read the prerendered `.html` and asserted on the whole
 * file. Also wrong — Next writes the shell AND the resolved streamed payload
 * into the same file. The streamed part is appended inside
 * `<div hidden id="S:n">` and swapped in by a `$RC(...)` script.
 *
 * Splitting at that marker gives the real shell, deterministically, with no
 * timing involved at all.
 */

/**
 * Return only the prerendered SHELL of a built page.
 *
 * Everything from the first `<div hidden id="S:` onward is streamed content
 * that React swaps into its Suspense boundary on the client.
 */
function staticShell(relativePath: string): string {
  const html = readFileSync(
    join(process.cwd(), ".next/server/app", relativePath),
    "utf8",
  );
  const streamStart = html.indexOf('<div hidden id="S:');
  return streamStart === -1 ? html : html.slice(0, streamStart);
}

test.describe("Product page", () => {
  test("name and price are in the static shell", () => {
    const shell = staticShell("products/aurora-over-ear-headphones.html");

    // `generateStaticParams` prerenders every slug, so the product itself
    // needs no request. Remove it and these drop out of the shell.
    expect(shell).toContain("Aurora Over-Ear Headphones");
    expect(shell).toContain("$249.00");
  });

  test("reviews are NOT in the static shell", () => {
    const shell = staticShell("products/aurora-over-ear-headphones.html");

    // Reviews sit behind their own <Suspense> so a slow review query can
    // never delay the product details.
    expect(shell).not.toContain("What people say");
  });

  test("is instant on an initial load", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto("/products/aurora-over-ear-headphones");
        await expect(page.locator("h1")).toContainText(
          "Aurora Over-Ear Headphones",
        );
      },
      // Required when page.goto() is the first navigation — instant() needs
      // the origin before it requests the document.
      { baseURL },
    );

    // Released from the scope: streamed content must actually arrive.
    // Without this, deleting reviews entirely would still pass.
    await expect(page.getByText("What people say")).toBeVisible();
  });
});

test.describe("Catalogue listing", () => {
  test("page chrome is in the shell, results are not", () => {
    const shell = staticShell("products.html");

    // The payoff of never awaiting `searchParams` in the page function.
    expect(shell).toContain(">Shop<");
    // A product here would mean the page started awaiting searchParams and
    // the shell went request-specific.
    expect(shell).not.toContain("aurora-over-ear-headphones");
  });

  test("is instant on an initial load", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto("/products");
        await expect(page.locator("h1")).toContainText("Shop");
      },
      { baseURL },
    );

    await expect(
      page.getByRole("link", { name: /Aurora Over-Ear Headphones/ }).first(),
    ).toBeVisible();
  });
});

test.describe("Cart page", () => {
  test("heading is in the shell, cookie-dependent lines are not", () => {
    const shell = staticShell("cart.html");

    // The whole page is about per-user data, yet the heading still
    // prerenders — because the cookie read is isolated below <Suspense>.
    expect(shell).toContain("Your cart");
    // If this fails, someone hoisted `getCart()` out of the boundary and
    // every cart render became request-blocking.
    expect(shell).not.toContain("Your cart is empty");
  });

  test("is instant on an initial load", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto("/cart");
        await expect(page.locator("h1")).toContainText("Your cart");
      },
      { baseURL },
    );

    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });
});
