"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import type { Filters } from "@/lib/filters";

/** Global typeahead across product/sku/invoice, scoped to the date window. */
export function useSearch(filters: Filters, q: string) {
  const term = q.trim();
  const query = { dateFrom: filters.dateFrom, dateTo: filters.dateTo, q: term, limit: 8 };
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => unwrap(api.GET("/api/v1/search", { params: { query } })),
    enabled: term.length >= 2, // don't search on a single character
  });
}
