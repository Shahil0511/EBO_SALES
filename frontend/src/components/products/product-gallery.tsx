"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { ProductCard } from "@/components/products/product-card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { type ProductRankBy, useProducts } from "@/lib/api/hooks/use-products";
import { serializeFilters } from "@/lib/filters";
import { num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 18;
const TABS: { key: ProductRankBy; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "units", label: "Units sold" },
  { key: "returns", label: "Returns" },
];

export function ProductGallery({ className }: { className?: string }) {
  const { filters } = useFilters();
  const [rankBy, setRankBy] = useState<ProductRankBy>("revenue");
  const [page, setPage] = useState(1);

  // Reset to page 1 when the ranking or filters change — React's "adjust state during
  // render" pattern (re-renders immediately; avoids an effect that only calls setState).
  const resetKey = `${rankBy}|${JSON.stringify(filters)}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const { data, isLoading, isError, isPlaceholderData } = useProducts(filters, {
    rankBy,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;
  const qs = serializeFilters(filters).toString();

  return (
    <section className={cn("border-border bg-card shadow-card flex flex-col rounded-xl border p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold">Products</h3>
          <p className="text-muted-foreground text-xs">{num(total)} with sales in range</p>
        </div>
        <Segmented value={rankBy} onChange={setRankBy} options={TABS} layoutId="productRank" ariaLabel="Rank by" />
      </div>

      {isError ? (
        <p className="text-destructive text-sm">Failed to load products.</p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No products in this view.</p>
      ) : (
        <Reveal>
          <div
            className={cn(
              "grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
              isPlaceholderData && "opacity-60",
            )}
          >
            {items.map((p) => (
              <ProductCard
                key={p.productCode}
                product={p}
                href={`/products?code=${encodeURIComponent(p.productCode)}&${qs}`}
              />
            ))}
          </div>
        </Reveal>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border-border hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Prev
          </button>
          <span className="text-muted-foreground text-xs">
            Page {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="border-border hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
          >
            Next <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}
