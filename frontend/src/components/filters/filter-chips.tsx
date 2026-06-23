"use client";

import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";

import { useFilterOptions } from "@/lib/api/hooks/use-filter-options";
import { useSalespeople } from "@/lib/api/hooks/use-salespeople";
import type { Filters } from "@/lib/filters";
import { SPRING } from "@/lib/motion/tokens";
import { useFilters } from "@/lib/use-filters";

type Chip = { id: string; label: string; onRemove: () => void };
type MultiKey = "stores" | "brands" | "categories" | "channels" | "salespersons" | "products";

const CHANNEL_LABELS: Record<string, string> = { BM: "Retail (BM)", EC: "E-commerce (EC)" };

export function FilterChips() {
  const { filters, setFilters, resetFilters } = useFilters();
  // Cached by TanStack Query (same keys as the rail) → no extra requests. Used to show
  // human names instead of raw store/staff codes in the chips.
  const { data: options } = useFilterOptions(filters);
  const { data: staff } = useSalespeople(filters);

  const storeNames = new Map((options?.stores ?? []).map((s) => [s.code, s.name ?? s.code]));
  const staffNames = new Map((staff?.salespersons ?? []).map((s) => [s.code, s.name ?? s.code]));

  const chips: Chip[] = [];

  const addMulti = (key: MultiKey, prefix: string, resolve?: (v: string) => string | undefined) => {
    const values = filters[key];
    if (values.length === 0) return;
    const display = (v: string) => resolve?.(v) ?? v;
    if (values.length <= 3) {
      for (const v of values) {
        chips.push({
          id: `${key}-${v}`,
          label: `${prefix}: ${display(v)}`,
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

  addMulti("stores", "Store", (v) => storeNames.get(v));
  addMulti("brands", "Brand");
  addMulti("categories", "Category");
  addMulti("channels", "Channel", (v) => CHANNEL_LABELS[v]);
  addMulti("salespersons", "Staff", (v) => staffNames.get(v));
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
      <AnimatePresence initial={false}>
        {chips.map((c) => (
          <m.span
            key={c.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={SPRING.card}
            className="border-border bg-card inline-flex max-w-[16rem] items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
          >
            <span className="truncate">{c.label}</span>
            <button
              type="button"
              onClick={c.onRemove}
              aria-label={`Remove ${c.label}`}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="size-3" />
            </button>
          </m.span>
        ))}
      </AnimatePresence>
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
