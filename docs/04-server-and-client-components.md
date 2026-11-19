# Topic 4 — Server & Client Components

Built as part of the cart and reviews features, so the boundary is drawn where
a real app would draw it rather than in a toy example.

---

## 1. The default is server

Every component in `src/app/` and `src/features/*/components/` is a Server
Component **unless** it opens with `"use client"`. Four files in the whole
project need it:

| File | Why it must be a Client Component |
| --- | --- |
| `cart/components/add-to-cart-form.tsx` | `useActionState`, `useFormStatus` |
| `cart/components/cart-lines.tsx` | `useOptimistic`, `useTransition` |
| `reviews/components/review-form.tsx` | `useActionState` |
| `components/layout/shop-nav.tsx` | `usePathname` |

Everything else — the product grid, cart badge, review list, every page —
renders on the server and ships no component JavaScript.

`"use client"` marks a **boundary, not a file**. Every module imported from a
Client Component is pulled into the client bundle too, which is why the data
layer must never be reachable from one.

---

## 2. Measured: what actually reaches the browser

The claim "server data stays on the server" is easy to assert and easy to get
wrong. Grepping the 38 built client chunks:

| String | Client chunks | Server files |
| --- | --- | --- |
| `"Closed-back wireless headphones"` (seed copy) | **0** | 24 |
| `cat_accessories` (seed id) | **0** | — |
| `prod_001` (product id) | **0** | 26 |
| `nexus_cart` (cookie name) | **0** | — |
| `queryProducts` (query fn) | **0** | — |

The entire catalogue, the cookie name and the query layer are absent from every
client chunk, while present in server output. Two things enforce that:

1. **`import "server-only"`** in `catalog-repository.ts`, `cart-store.ts` and
   `review-store.ts`. Importing any of them from a Client Component is a build
   error, not a silent leak.
2. **Props are the only channel.** `<AddToCartForm slug={product.slug} />`
   sends one string. The client never receives the product object, so it
   cannot leak one.

---

## 3. Serialisation: what can cross the boundary

Props from Server → Client are serialised into the RSC payload.

| Allowed | Not allowed |
| --- | --- |
| Primitives, plain objects, arrays | Functions (except Server Actions) |
| `Date`, `Map`, `Set`, TypedArray | Class instances |
| JSX / React elements (as pass-through) | Symbols, `WeakMap` |
| Server Actions | Anything with methods |

The error is specific and worth recognising:

```
Error: Functions cannot be passed directly to Client Components unless you
explicitly expose it by calling "use server".
```

`CartLines` receives a `CartSummary` — a plain object of strings and numbers,
deliberately. Had it been a class with a `.total()` method, it could not cross.
Totals are therefore computed server-side and passed as plain numbers, which is
also why a user cannot forge them.

---

## 4. Composition: Server Components as `children`

The pattern that avoids pushing the boundary upward. `@modal/(.)products/[slug]`
is a Server Component that renders `<Modal>` — a Client Component — and passes
server-rendered content as children:

```tsx
// Server Component
<Modal>                        {/* client: dialog, focus trap, router.back() */}
  <Image … />                  {/* stays server-rendered */}
  <h2>{product.name}</h2>
  <AddToCartForm slug={…} />   {/* its own small client island */}
</Modal>
```

`Modal` never imports the product data or the repository. It receives already-
rendered output and passes it through. The naive alternative — importing the
product inside `Modal` — would drag the catalogue into the client bundle.

**Rule of thumb:** when a Client Component needs to *wrap* server content, take
it as `children`. Only *import* a Server Component into a Client Component if
you want its dependencies in the browser, which you never do.

---

## 5. Client islands stay small

`AddToCartForm` is a Client Component, but look at what it contains: a form, a
hidden input, a button and a status message. The product lookup, price
formatting, stock check and cart write all happen on the server.

The same page therefore has:

- a server-rendered product detail (no JS)
- a server-rendered review list (no JS)
- a ~1KB client island for the add button
- a ~2KB client island for the review form

versus a traditional SPA where the whole page is client-side and the catalogue
query has to be exposed as an API.

---

## 6. Hooks are a client-only concept

`useState`, `useEffect`, `useActionState`, `useOptimistic`, `useFormStatus`,
`usePathname` — all require `"use client"`. Using one in a Server Component
fails the build.

The inverse also holds: a Server Component can be `async` and `await` directly.
A Client Component cannot (`async` client components are not supported), which
is why data fetching belongs on the server side of the boundary.

One subtlety found while building: **`useFormStatus` must be called in a CHILD
of the `<form>`**, not in the component that renders it. Called alongside, it
returns `pending: false` forever — it reads the nearest form *above* it in the
tree. `SubmitButton` is a separate component for exactly that reason.

---

## 7. A lint rule that caught a real anti-pattern

The first version of the "added to cart" confirmation auto-hid after 3 seconds
using `useState` + `useEffect`:

```
error  Avoid calling setState() directly within an effect
       react-hooks/set-state-in-effect
```

The rule is right — a state write in an effect body forces a second render pass
immediately after the first. The repairs were worse than the feature: resetting
the timer per submit needs a changing `key`, but the action returns an identical
message for the same product, and deriving a key by mutating a ref during render
is an impure render that bumps on *every* re-render rather than every submit.

So the timer was removed. The message now persists until the next submit
replaces it — fewer moving parts, no suppression, and arguably better UX since a
confirmation that vanishes on its own is easy to miss.

---

## 8. Verified

- 0 of 38 client chunks contain seed data, product ids, the cart cookie name or
  query functions — ✅ grepped
- Same strings present in 24–26 server files — ✅ sanity check passed
- `npm run build` / `typecheck` / `lint` / `format:check` — ✅ clean
- Add-to-cart, optimistic quantity, and review validation all driven in a real
  browser — see Topics 5 and 6

---

## Related

- **[Topic 5 — Cache Components](05-cache-components.md):** how the server side
  of this boundary is cached, including the one cache variant allowed to read
  cookies.
- **[Topic 6 — Data Fetching & Mutations](06-data-fetching-and-mutations.md):**
  Server Actions, the only function type that may cross the boundary.
