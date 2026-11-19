import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";

import { Container } from "@/components/ui/container";
import { queryCategories } from "@/features/catalog/lib/queries";
import type { Category } from "@/features/catalog/types";

/**
 * Note the import: `lib/queries`, NOT `server/catalog-repository`.
 *
 * Importing the repository here fails the build outright, because it starts
 * with `import "server-only"`:
 *
 *   Error: You're importing a module that depends on "server-only". This API is
 *   only available in Server Components in the App Router, but you are using it
 *   in the Pages Router.
 *
 * Its `"use cache"` directives are equally off-limits — Cache Components is an
 * App Router feature. The shared query layer exists precisely so both routers
 * can run the same logic under different caching models.
 *
 * `satisfies GetStaticProps<T>` rather than a type annotation: it validates the
 * return shape while preserving the literal type, which is what lets
 * `InferGetStaticPropsType` type the component props below.
 */
export const getStaticProps = (async () => {
  return { props: { categories: queryCategories() } };
}) satisfies GetStaticProps<{ categories: Category[] }>;

export default function ClassicIndex({
  categories,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      {/*
        `next/head` — the Pages Router's per-page <head>. Completely unrelated
        to the `Head` imported from `next/document`, and unrelated to the App
        Router's `metadata` export, which does not exist here.
      */}
      <Head>
        <title>Classic — Pages Router | Nexus Store</title>
        <meta
          name="description"
          content="The Pages Router half of the storefront."
        />
      </Head>

      <Container>
        <div className="max-w-2xl py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-content">
            Pages Router
          </h1>
          <p className="mt-2 leading-relaxed text-content-muted">
            These routes are served by <code>src/pages/</code>, running beside
            the App Router in the same application. Same design tokens, same
            data, entirely different rendering model.
          </p>

          <h2 className="mt-8 text-lg font-semibold text-content">
            Categories (via getStaticProps)
          </h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-content-muted">
            {categories.map((category) => (
              <li key={category.id}>
                <span className="font-medium text-content">
                  {category.name}
                </span>{" "}
                — {category.description}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </>
  );
}
