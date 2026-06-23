"use client";

import { Search, X } from "lucide-react";
import { useId, useState } from "react";

import { useSearch } from "@/lib/api/hooks/use-search";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { product: "Product", sku: "SKU", invoice: "Invoice" };

const INPUT_CLASS =
  "border-border bg-card h-9 w-full rounded-full border pr-8 pl-9 text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2 outline-none";

export function GlobalSearch() {
  const { filters, setFilters } = useFilters();
  const [q, setQ] = useState(filters.search ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // Keep the input in sync with the URL when `search` changes externally (chip removed,
  // reset). Typing never changes filters.search, so this only fires on external changes —
  // the "adjust state during render" pattern (no effect, no lint complaint).
  const [prevSearch, setPrevSearch] = useState(filters.search);
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setQ(filters.search ?? "");
  }

  const { data } = useSearch(filters, q);
  const hits = data?.hits ?? [];
  const showList = open && q.trim().length >= 2 && hits.length > 0;

  const apply = (value: string | null) => {
    setFilters({ search: value || null });
    setQ(value ?? "");
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter" && active >= 0 && active < hits.length) {
      e.preventDefault();
      apply(hits[active].value);
    }
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
          role="combobox"
          aria-label="Search products, SKUs and invoices"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)} // option onMouseDown preventDefault keeps focus for clicks
          onKeyDown={onKeyDown}
          placeholder="Search product code, SKU or invoice…"
          className={INPUT_CLASS}
        />
        {(q || filters.search) && (
          <button
            type="button"
            onClick={() => apply(null)}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-transform hover:scale-110"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-card absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border py-1 shadow-lg"
        >
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.value}`} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(h.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm",
                  i === active ? "bg-muted" : "hover:bg-muted",
                )}
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
