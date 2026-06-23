"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

export type ProductRankBy = "revenue" | "units" | "returns";

/** One ranked, paginated page of the product gallery. */
export function useProducts(
  filters: Filters,
  opts: { rankBy: ProductRankBy; page: number; pageSize: number },
) {
  const query = {
    ...toQueryParams(filters),
    rankBy: opts.rankBy,
    page: opts.page,
    pageSize: opts.pageSize,
  };
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => unwrap(api.GET("/api/v1/products", { params: { query } })),
    placeholderData: keepPreviousData, // keep the current page visible while the next loads
  });
}
