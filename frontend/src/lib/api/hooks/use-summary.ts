"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

/** KPI block + period-over-period deltas for the current filters. */
export function useSummary(filters: Filters) {
  const query = toQueryParams(filters);
  return useQuery({
    queryKey: ["summary", query],
    queryFn: () => unwrap(api.GET("/api/v1/analytics/summary", { params: { query } })),
  });
}
