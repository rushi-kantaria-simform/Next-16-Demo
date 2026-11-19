import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/features/catalog/components/product-card";
import { ProductGridSkeleton } from "@/features/catalog/components/product-grid-skeleton";
import {
  getCategories,
  getFeaturedProducts,
} from "@/features/catalog/server/catalog-repository";

/**
 * Home page.
 *
 * The composition pattern to notice: the page itself is synchronous and
 * instant. Each async section is its own component wrapped in <Suspense>, so a
 * slow section never blocks the hero from rendering.
 *
 * Because the repository functions are marked `use cache`, these sections are
 * prerendered into the static shell and the fallbacks will not flash in
 * production. The boundaries still matter — they are what let a section become
 * request-time dynamic later without rewriting the page.
 */
export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-brand-50 to-transparent dark:from-transparent">
        <Container>
          <div className="flex max-w-2xl flex-col gap-5 py-20">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              Built on Next.js 16
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-content sm:text-5xl">
              Modern tech, thoughtfully chosen.
            </h1>
            <p className="text-lg leading-relaxed text-pretty text-content-muted">
              A small catalogue of audio, wearables and desk hardware — and a
              working reference for the App Router, Cache Components and Server
              Actions.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg">
                  Browse the catalogue
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="secondary">
                  About this build
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <section className="py-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-content">
                Featured
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Hand-picked from across the catalogue.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              View all
            </Link>
          </div>

          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <FeaturedProducts />
          </Suspense>
        </section>

        <section className="pb-20">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-content">
            Shop by category
          </h2>
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid />
          </Suspense>
        </section>
      </Container>
    </>
  );
}

/** Async Server Component — awaited inside its own Suspense boundary. */
async function FeaturedProducts() {
  const products = await getFeaturedProducts(4);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          // Only the first row is above the fold.
          eager={index < 2}
        />
      ))}
    </div>
  );
}

async function CategoryGrid() {
  const categories = await getCategories();

  return (
    <div className="grid-fit-64 gap-4">
      {categories.map((category) => (
        <Link key={category.id} href={`/categories/${category.slug}`}>
          <Card className="h-full transition-colors hover:border-brand-300">
            <CardBody className="flex flex-col gap-1">
              <CardTitle>{category.name}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="grid-fit-64 gap-4">
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index} className="animate-pulse">
          <CardBody className="flex flex-col gap-3">
            <div className="h-5 w-1/3 rounded bg-surface-muted" />
            <div className="h-4 w-full rounded bg-surface-muted" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
