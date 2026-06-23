"use client";

import { DateRangeGroup } from "@/components/filters/date-range-group";
import { MultiSelectGroup, type SelectOption } from "@/components/filters/multi-select-group";
import { QuantityGroup } from "@/components/filters/quantity-group";
import { useFilterOptions } from "@/lib/api/hooks/use-filter-options";
import { useSalespeople } from "@/lib/api/hooks/use-salespeople";
import { useFilters } from "@/lib/use-filters";

const CHANNEL_LABELS: Record<string, string> = { BM: "Retail store (BM)", EC: "E-commerce (EC)" };

/** The filter controls (no outer container) — shared by the desktop rail + the mobile drawer. */
export function FilterRailContent() {
  const { filters, setFilters, resetFilters } = useFilters();
  const options = useFilterOptions(filters);
  const staff = useSalespeople(filters);

  const storeOptions: SelectOption[] =
    options.data?.stores.map((s) => ({ value: s.code, label: s.name ?? s.code })) ?? [];
  const brandOptions: SelectOption[] = (options.data?.brands ?? []).map((b) => ({ value: b, label: b }));
  const categoryOptions: SelectOption[] = (options.data?.categories ?? []).map((c) => ({ value: c, label: c }));
  const channelOptions: SelectOption[] = (options.data?.channels ?? []).map((c) => ({
    value: c,
    label: CHANNEL_LABELS[c] ?? c,
  }));
  const staffOptions: SelectOption[] = (staff.data?.salespersons ?? []).map((s) => ({
    value: s.code,
    label: s.name ?? s.code,
    count: s.count,
  }));

  const hasActiveFilters =
    filters.stores.length > 0 ||
    filters.brands.length > 0 ||
    filters.categories.length > 0 ||
    filters.channels.length > 0 ||
    filters.salespersons.length > 0 ||
    filters.products.length > 0 ||
    filters.qtyMin !== null ||
    filters.qtyMax !== null ||
    Boolean(filters.search);

  return (
    <>
      <div className="bg-sidebar sticky top-0 z-10 flex h-12 items-center justify-between px-4">
        <h2 className="font-heading text-sm font-semibold">Filters</h2>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="text-muted-foreground hover:text-foreground text-xs disabled:opacity-50"
        >
          Reset all
        </button>
      </div>
      <div className="space-y-2 px-3 pb-6">
        <DateRangeGroup dateFrom={filters.dateFrom} dateTo={filters.dateTo} onChange={(r) => setFilters(r)} />
        <MultiSelectGroup
          title="Stores"
          options={storeOptions}
          selected={filters.stores}
          onChange={(stores) => setFilters({ stores })}
          searchable
          loading={options.isLoading}
        />
        <MultiSelectGroup
          title="Brand"
          options={brandOptions}
          selected={filters.brands}
          onChange={(brands) => setFilters({ brands })}
          loading={options.isLoading}
        />
        <MultiSelectGroup
          title="Category"
          options={categoryOptions}
          selected={filters.categories}
          onChange={(categories) => setFilters({ categories })}
          searchable
          loading={options.isLoading}
        />
        <MultiSelectGroup
          title="Channel"
          options={channelOptions}
          selected={filters.channels}
          onChange={(channels) => setFilters({ channels })}
          loading={options.isLoading}
        />
        <QuantityGroup qtyMin={filters.qtyMin} qtyMax={filters.qtyMax} onChange={(qty) => setFilters(qty)} />
        <MultiSelectGroup
          title="Sales staff"
          options={staffOptions}
          selected={filters.salespersons}
          onChange={(salespersons) => setFilters({ salespersons })}
          searchable
          loading={staff.isLoading}
        />
      </div>
    </>
  );
}
