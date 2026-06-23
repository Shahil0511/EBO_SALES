"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

export type TrendBucket = "day" | "week";

/** Revenue/units time series, bucketed by day or week. */
export function useTrend(filters: Filters, bucket: TrendBucket) {
  const query = { ...toQueryParams(filters), bucket };
  return useQuery({
    queryKey: ["trend", query],
    queryFn: () => unwrap(api.GET("/api/v1/analytics/trend", { params: { query } })),
  });
}
