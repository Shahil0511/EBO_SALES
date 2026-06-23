"use client";

import { type BreakdownDimension, useBreakdown } from "@/lib/api/hooks/use-breakdown";
import { inr } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

// Only these dimensions can click-to-filter, because their label IS the filter value
// (category_name / brand_name / channel code). Store/salesperson/region are display-only
// here — their filter wants codes, not the display name (a future enhancement).
type ClickField = "categories" | "brands" | "channels";

export function BreakdownBars({
  dimension,
  title,
  color = "var(--chart-1)",
  filterField,
  className,
}: {
  dimension: BreakdownDimension;
  title: string;
  color?: string;
  filterField?: ClickField;
  className?: string;
}) {
  const { filters, setFilters } = useFilters();
  const { data, isLoading, isError } = useBreakdown(filters, dimension, 8);

  const items = data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => Math.abs(i.netRevenue)));
  const selected = filterField ? filters[filterField] : [];

  const toggle = (label: string) => {
    if (!filterField) return;
    const current = filters[filterField];
    setFilters({
      [filterField]: current.includes(label)
        ? current.filter((v) => v !== label)
        : [...current, label],
    });
  };

  return (
    <section className={cn("border-border bg-card flex flex-col rounded-xl border p-4", className)}>
      <h3 className="font-heading mb-3 text-sm font-semibold">{title}</h3>
      {isError ? (
        <p className="text-destructive text-xs">Failed to load</p>
      ) : isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-muted h-6 animate-pulse rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data in range</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const isSelected = selected.includes(item.label);
            const bar = (
              <>
                <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                  <span
                    className={cn("truncate", isSelected && "text-primary font-medium")}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {inr(item.netRevenue)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(Math.abs(item.netRevenue) / max) * 100}%`, background: color }}
                  />
                </div>
              </>
            );
            return (
              <li key={item.label}>
                {filterField ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    className="hover:bg-muted/60 block w-full cursor-pointer rounded-md p-1 text-left"
                  >
                    {bar}
                  </button>
                ) : (
                  <div className="p-1">{bar}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
