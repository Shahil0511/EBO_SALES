"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

/** The seven KPI metrics, matching the backend `MetricKey` (the [metric] route segment). */
export const METRIC_KEYS = [
  "net_revenue",
  "gross_sales",
  "returns_value",
  "units_sold",
  "invoices",
  "customers",
  "discount_rate",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export function isMetricKey(value: string): value is MetricKey {
  return (METRIC_KEYS as readonly string[]).includes(value);
}

/** Full drill-down for one KPI: value + delta, day trend, and dimension breakdowns. */
export function useMetricDetail(filters: Filters, metric: MetricKey) {
  const query = toQueryParams(filters);
  return useQuery({
    queryKey: ["metric-detail", metric, query],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/analytics/metrics/{metric}", {
          params: { path: { metric }, query },
        }),
      ),
  });
}
