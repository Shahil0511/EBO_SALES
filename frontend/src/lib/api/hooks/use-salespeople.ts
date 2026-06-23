"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Filters } from "@/lib/filters";

/**
 * The cascading staff list: salespeople with sales in the selected store(s) and window.
 * Keyed on dates + stores, so selecting/clearing stores re-queries and narrows the list
 * (empty for an EC-only selection — online has no in-store staff).
 */
export function useSalespeople(filters: Filters) {
  return useQuery({
    queryKey: ["salespeople", filters.dateFrom, filters.dateTo, filters.stores],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/filters/salespeople", {
        params: {
          query: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            stores: filters.stores.length ? filters.stores : undefined,
          },
        },
      });
      if (error || !data) throw new Error("Failed to load staff");
      return data;
    },
  });
}
