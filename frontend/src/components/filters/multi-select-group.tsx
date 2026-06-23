"use client";

import { useState } from "react";

import { FilterGroup } from "@/components/filters/filter-group";

export type SelectOption = { value: string; label: string; count?: number };

/**
 * A collapsible group whose body is an (optionally searchable) checklist of options.
 * Toggling a checkbox calls `onChange` with the new selection — which the rail writes
 * straight to the URL, so the whole dashboard refetches. Instant-apply, no submit.
 */
export function MultiSelectGroup({
  title,
  options,
  selected,
  onChange,
  searchable = false,
  loading = false,
}: {
  title: string;
  options: SelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible =
    searchable && query
      ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : options;

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <FilterGroup title={title} badge={selected.length}>
      {searchable && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="border-border bg-background mb-2 h-8 w-full rounded-md border px-2 text-sm outline-none"
        />
      )}
      <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
        <button
          type="button"
          className="hover:text-foreground"
          onClick={() => onChange([...new Set([...selected, ...visible.map((o) => o.value)])])}
        >
          Select all
        </button>
        <button type="button" className="hover:text-foreground" onClick={() => onChange([])}>
          Clear
        </button>
      </div>
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {loading ? (
          <p className="text-muted-foreground px-1 py-2 text-xs">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground px-1 py-2 text-xs">No options</p>
        ) : (
          visible.map((o) => (
            <label
              key={o.value}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-primary size-3.5"
              />
              <span className="flex-1 truncate" title={o.label}>
                {o.label}
              </span>
              {o.count !== undefined && (
                <span className="text-muted-foreground font-mono text-[11px]">
                  {o.count.toLocaleString("en-IN")}
                </span>
              )}
            </label>
          ))
        )}
      </div>
    </FilterGroup>
  );
}
