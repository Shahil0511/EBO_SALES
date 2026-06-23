"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Filters } from "@/lib/filters";

/**
 * Selectable values for the multi-selects (stores/brands/categories/channels), scoped to
 * the date window. Keyed only on the dates — the option lists don't depend on the other
 * filters, so changing a store selection won't refetch the option lists.
 */
export function useFilterOptions(filters: Filters) {
  return useQuery({
    queryKey: ["filter-options", filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/filters/options", {
        params: { query: { dateFrom: filters.dateFrom, dateTo: filters.dateTo } },
      });
      if (error || !data) throw new Error("Failed to load filter options");
      return data;
    },
  });
}
