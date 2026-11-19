import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardBody,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCategories } from "@/features/catalog/server/catalog-repository";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse the catalogue by category.",
};

export default function CategoriesPage() {
  return (
    <Container>
      <div className="py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Categories
        </h1>
        <div className="mt-8">
          <Suspense fallback={<p className="text-content-muted">Loading…</p>}>
            <CategoryList />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function CategoryList() {
  const categories = await getCategories();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
