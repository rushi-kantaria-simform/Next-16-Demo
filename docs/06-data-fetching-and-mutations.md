# Topic 6 — Data Fetching & Mutations

Two real mutations end to end: a cookie-backed **cart** and a validated
**review form**. Everything below was driven in a browser against a production
build.

---

## 1. What was built

```
src/features/cart/
├── types.ts                      zod schemas — the cookie is untrusted input
├── server/cart-store.ts          cookie read/write, server-only
├── server/actions.ts             "use server" — add / update / remove / clear
└── components/
    ├── cart-badge.tsx            server, "use cache: private"
    ├── add-to-cart-form.tsx      client, useActionState + useFormStatus
    └── cart-lines.tsx            client, useOptimistic + useTransition

src/features/reviews/
├── types.ts                      zod schema + form-state union
├── server/review-store.ts        in-memory (see the limitation below)
├── server/actions.ts             "use server" — validate, write, updateTag
└── components/
    ├── review-section.tsx        server, "use cache"
    └── review-form.tsx           client, useActionState

src/app/(shop)/cart/page.tsx      PPR: static shell + streamed lines
```

---

## 2. Server Actions are public endpoints

The single most important thing about `"use server"`: each exported function
becomes a **public HTTP POST endpoint**. Next assigns it an id and routes to
it. Anyone can call it with any payload — your form is not the only caller.

Three rules follow, and all three are applied here:

**Validate everything.** `formData` is attacker-controlled:

```ts
const parsed = addSchema.safeParse({
  slug: formData.get("slug"),
  quantity: formData.get("quantity") ?? 1,
});
if (!parsed.success) return { status: "error", … };
```

**Derive authority on the server.** The cart cookie stores *identity and
quantity only*. Prices are looked up from the catalogue at render time:

```ts
lineTotalInCents: product.priceInCents * item.quantity
```

If the cookie carried its own price, a user could edit it and buy a $899
monitor for $1.

**Prefer bound arguments to hidden inputs.** `removeFromCart.bind(null, slug)`
and `submitReview.bind(null, productSlug)` pass values server-side where the
client cannot touch them. An `<input type="hidden">` is editable in devtools —
which is why `addToCart` re-validates its hidden `slug` against the catalogue
rather than trusting it.

---

## 3. Return errors, throw exceptions

| | Returned value | Thrown error |
| --- | --- | --- |
| Lands in | `useActionState` state | nearest `error.tsx` |
| User sees | inline message on the field | full-page error UI |
| Right for | validation, business rules | genuine failures |

Every validation path here **returns**. A thrown error for "name must be at
least 2 characters" would replace the entire product page — wildly
disproportionate.

The form state is a discriminated union, so the component cannot read
`fieldErrors` off a success state:

```ts
type ReviewFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string;
      fieldErrors: Partial<Record<keyof ReviewInput, string>>;
      values: { author: string; rating: string; body: string } };
```

`values` echoes the submitted input back so a failed submit does not wipe the
textarea — a small thing users notice immediately.

---

## 4. React 19 hooks, and where each belongs

| Hook | Used in | Returns |
| --- | --- | --- |
| `useActionState(action, initial)` | both forms | `[state, formAction, pending]` |
| `useFormStatus()` | `SubmitButton` | `{ pending, data, method, action }` |
| `useOptimistic(state, reducer)` | `CartLines` | `[optimisticState, apply]` |
| `useTransition()` | `CartLines` | `[isPending, startTransition]` |

Three gotchas worth recording:

**`useActionState` already gives you `pending`** — the third element. Pairing
it with a separate `useTransition` purely for loading state, as a lot of code
still does, is redundant since React 19.

**`useFormStatus` must be called in a CHILD of the `<form>`.** Called in the
component that renders the form, it returns `pending: false` forever — it reads
the nearest form *above* it in the tree. That is why `SubmitButton` is its own
component.

**`useOptimistic` must be dispatched inside a transition.** Outside one, React
throws *"An optimistic state update occurred outside a transition"*.

---

## 5. Optimistic UI, measured

Every quantity change is a round-trip: write cookie → expire cache →
re-render. Even at 50ms the arrows feel laggy and users click repeatedly.

`useOptimistic` shows a provisional state immediately and discards it when the
real state arrives. If the action fails, the optimistic value is dropped
automatically — **no manual rollback code**.

Measured in a browser, clicking "increase" on a quantity of 2:

| Moment | Displayed quantity |
| --- | --- |
| before click | 2 |
| **+50 ms** (inside the round-trip) | **3** |
| after server settled | 3, subtotal `$747.00` |

The reducer recomputes `lineTotalInCents` too — otherwise the row shows the new
quantity against the old price for one frame.

While pending the list dims (`opacity-70`) rather than disabling: the
optimistic value is already on screen, so the UI should stay interactive.

---

## 6. Validation, verified

Submitting a deliberately invalid review (name `X`, no rating, body `short`)
produced all three server-side errors inline:

| Field | `aria-invalid` | Message |
| --- | --- | --- |
| author | `true` | Please enter at least 2 characters. |
| rating | `true` | Please choose a rating. |
| body | `true` | Tell us a little more — at least 10 characters. |

…plus the summary *"Please fix the highlighted fields."*, with both typed
values echoed back intact.

Note the form carries `noValidate` and has **no client-side validation**. The
action is the only source of truth, so the rules cannot drift between client
and server, and the enforcement is identical with JavaScript disabled.

Accessibility is wired rather than assumed: `aria-invalid` on the field,
`aria-describedby` pointing at the error's `id`, and `aria-live="polite"` on
the summary. Without `aria-describedby` a screen reader announces the input but
never the error sitting next to it.

Submitting a valid review moved the list 0 → 1 and updated the stats badge to
`5.0 ★ · 1` in the same render — `updateTag` doing its job.

---

## 7. Cookie as a data store

| Decision | Reason |
| --- | --- |
| `httpOnly: true` | **Verified**: `document.cookie` shows nothing. The cart is only ever mutated through an action, so the client has no need to read it. |
| `sameSite: "lax"` | CSRF mitigation while surviving normal top-level navigation. |
| `secure` in production only | so local HTTP development still works. |
| Schema-validated on read | the cookie is user-editable; a malformed value degrades to an empty cart rather than a 500. |
| Identity + quantity only | prices come from the catalogue, never the cookie. |

`cookies().set()` is legal **only** in a Server Action or Route Handler.
Calling it while rendering throws — response headers are already streaming by
then, so there is nothing left to attach `Set-Cookie` to.

---

## 8. Honest limitation: the review store

`review-store.ts` is a module-level `Map`. It resets on server restart, and in
a multi-instance or serverless deployment each instance keeps its own copy — a
review written on instance A is invisible on instance B.

It exists because the point of this topic is the mutation pipeline — validate,
write, invalidate, re-render — not persistence. Swapping it for a real database
touches that one file; the actions and components above it are unaffected.

**The cart does not share this flaw.** A cookie genuinely survives restarts and
is inherently per-user, which is why it was chosen for the feature that needed
to actually work.

---

## 9. Verified in a browser (production build)

| Check | Result |
| --- | --- |
| Add to cart → badge updates immediately | ✅ `Cart, empty` → `Cart, 1 item` |
| Add same product twice | ✅ one line, quantity 2 (not two lines) |
| Server-computed total | ✅ `$498.00` = 2 × $249 |
| Optimistic quantity at 50ms | ✅ shows 3 before server responds |
| Subtotal after settle | ✅ `$747.00` |
| Cart cookie readable from JS | ✅ no — `httpOnly` holds |
| Invalid review | ✅ 3 inline errors + values echoed |
| Valid review | ✅ appears instantly, stats update |
| Per-product tag isolation | ✅ Aurora's reviews untouched |
| Seed data in client bundle | ✅ 0 of 38 chunks |
| `build` / `typecheck` / `lint` / `format:check` | ✅ clean |

One bug found and fixed along the way: the badge announced *"Cart, 1 items"*.
Pluralisation now branches on the count.

---

## Related

- **[Topic 4](04-server-and-client-components.md):** the boundary these forms
  sit on, and what reaches the browser.
- **[Topic 5](05-cache-components.md):** `updateTag` vs `revalidateTag`, and
  why the cart badge is `"use cache: private"`.
