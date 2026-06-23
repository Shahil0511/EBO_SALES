"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

export type BreakdownDimension =
  | "store"
  | "category"
  | "brand"
  | "channel"
  | "salesperson"
  | "region"
  | "city"
  | "cluster";

/** Net revenue grouped by one dimension (top-`limit`, with share%). */
export function useBreakdown(filters: Filters, dimension: BreakdownDimension, limit = 8) {
  const query = { ...toQueryParams(filters), limit };
  return useQuery({
    queryKey: ["breakdown", dimension, query],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/breakdowns/{dimension}", {
          params: { path: { dimension }, query },
        }),
      ),
  });
}
