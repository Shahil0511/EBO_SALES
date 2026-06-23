"use client";

import { X } from "lucide-react";

import type { Filters } from "@/lib/filters";
import { useFilters } from "@/lib/use-filters";

type Chip = { id: string; label: string; onRemove: () => void };

type MultiKey = "stores" | "brands" | "categories" | "channels" | "salespersons" | "products";

export function FilterChips() {
  const { filters, setFilters, resetFilters } = useFilters();
  const chips: Chip[] = [];

  const addMulti = (key: MultiKey, prefix: string) => {
    const values = filters[key];
    if (values.length === 0) return;
    if (values.length <= 3) {
      for (const v of values) {
        chips.push({
          id: `${key}-${v}`,
          label: `${prefix}: ${v}`,
          onRemove: () => setFilters({ [key]: values.filter((x) => x !== v) } as Partial<Filters>),
        });
      }
    } else {
      chips.push({
        id: key,
        label: `${prefix}: ${values.length} selected`,
        onRemove: () => setFilters({ [key]: [] } as Partial<Filters>),
      });
    }
  };

  addMulti("stores", "Store");
  addMulti("brands", "Brand");
  addMulti("categories", "Category");
  addMulti("channels", "Channel");
  addMulti("salespersons", "Staff");
  addMulti("products", "Product");

  if (filters.qtyMin !== null || filters.qtyMax !== null) {
    chips.push({
      id: "qty",
      label: `Qty: ${filters.qtyMin ?? "min"}–${filters.qtyMax ?? "max"}`,
      onRemove: () => setFilters({ qtyMin: null, qtyMax: null }),
    });
  }
  if (filters.search) {
    chips.push({
      id: "search",
      label: `Search: "${filters.search}"`,
      onRemove: () => setFilters({ search: null }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-xs">
        {filters.dateFrom} → {filters.dateTo}
      </span>
      {chips.map((c) => (
        <span
          key={c.id}
          className="border-border bg-card inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove ${c.label}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {chips.length > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
