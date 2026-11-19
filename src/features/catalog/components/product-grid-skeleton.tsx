import { Card } from "@/components/ui/card";

/**
 * Suspense fallback for a product grid.
 *
 * Match the real grid's column count and card proportions — a skeleton with a
 * different shape causes a visible jump when the content swaps in, which is
 * worse than no skeleton at all.
 */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="animate-pulse">
          <div className="aspect-square bg-surface-muted" />
          <div className="flex flex-col gap-3 p-4">
            <div className="h-4 w-3/4 rounded bg-surface-muted" />
            <div className="h-4 w-1/3 rounded bg-surface-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
