"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { useSearch } from "@/lib/api/hooks/use-search";
import { useFilters } from "@/lib/use-filters";

const KIND_LABEL: Record<string, string> = { product: "Product", sku: "SKU", invoice: "Invoice" };

/**
 * Header search: typeahead suggestions across product/sku/invoice (useSearch), and
 * applying a term sets the `search` filter — which the backend ILIKEs across the same
 * fields, so the whole dashboard filters to matching rows.
 */
export function GlobalSearch() {
  const { filters, setFilters } = useFilters();
  const [q, setQ] = useState(filters.search ?? "");
  const [open, setOpen] = useState(false);
  const { data } = useSearch(filters, q);
  const hits = data?.hits ?? [];

  const apply = (value: string | null) => {
    setFilters({ search: value || null });
    setQ(value ?? "");
    setOpen(false);
  };

  return (
    <div className="relative mx-auto hidden w-full max-w-md md:block">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(q.trim() || null);
        }}
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search product code, SKU or invoice…"
          className="border-border bg-card h-9 w-full rounded-full border pr-8 pl-9 text-sm focus:outline-none"
        />
        {(q || filters.search) && (
          <button
            type="button"
            onClick={() => apply(null)}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {open && q.trim().length >= 2 && hits.length > 0 && (
        <ul className="border-border bg-card absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border py-1 shadow-lg">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.value}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep focus so onClick fires before blur
                onClick={() => apply(h.value)}
                className="hover:bg-muted flex w-full items-center justify-between px-3 py-1.5 text-left text-sm"
              >
                <span className="font-mono">{h.value}</span>
                <span className="text-muted-foreground text-[11px]">{KIND_LABEL[h.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
