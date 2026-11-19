import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  listProducts,
} from "@/features/catalog/server/catalog-repository";

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

// On the cold-request `200` vs warm `404` for unknown slugs, see the note in
// products/[slug]/page.tsx. Short version: it is documented PPR behaviour and
// Next injects `noindex` so crawlers ignore it.

export async function generateMetadata(
  props: PageProps<"/categories/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "Category not found" };

  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryDetailPage(
  props: PageProps<"/categories/[slug]">,
) {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  // `category.slug` is already a `CategorySlug` — the repository did the
  // narrowing from the raw URL string, so no cast is needed here.
  const { items } = await listProducts({ category: category.slug }, 1, 12);

  return (
    <Container>
      <div className="py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          {category.name}
        </h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          {category.description}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 4} />
          ))}
        </div>

        {items.length === 0 && (
          <p className="mt-8 text-content-muted">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </Container>
  );
}
